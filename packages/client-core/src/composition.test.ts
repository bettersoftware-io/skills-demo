import { createDirectorySimulator, type DirectorySnapshot, type Price } from "@skills-demo/domain";
import { Subject } from "rxjs";
import { describe, expect, it, onTestFinished } from "vitest";

import { type App, createApp } from "./composition.ts";

describe("the application", () => {
  it("shows the prices its price port produces", () => {
    const prices$ = new Subject<Price>();
    const app = createApp({ price: { prices: () => prices$ }, directory: createDirectorySimulator() });
    const subscription = app.presenters.prices.rows$.subscribe();

    prices$.next({ symbol: "EURUSD", mid: 1.1 });

    expect(app.presenters.prices.rows$.getValue().map((row) => row.symbol)).toEqual(["EURUSD"]);

    subscription.unsubscribe();
  });

  it("builds a separate selection machine for each component that asks", () => {
    const app = createApp({ price: { prices: () => new Subject<Price>() }, directory: createDirectorySimulator() });
    const first = app.machines.createSelection();
    const second = app.machines.createSelection();

    first.intents.select("EURUSD");

    expect(first.state$.getValue()).toEqual({ selected: "EURUSD" });
    expect(second.state$.getValue()).toEqual({ selected: null });

    first.dispose();
    second.dispose();
  });

  it("shows the categories and users its directory port holds", () => {
    const app = createDirectoryApp();

    expect(namesOf(app)).toEqual({ categories: ["Design", "Engineering"], users: ["Ada"] });
  });

  it("adds a category through the category form, which is then blank again", () => {
    const app = createDirectoryApp();
    const form = app.machines.createCategoryForm();

    form.intents.change({ name: "Support" });
    form.intents.save();

    expect(namesOf(app).categories).toEqual(["Design", "Engineering", "Support"]);
    expect(form.state$.getValue().draft).toEqual({ name: "" });

    form.dispose();
  });

  it("renames a category through its row, starting from its name", () => {
    const app = createDirectoryApp();
    const row = app.machines.createCategoryRow("design");

    row.intents.edit();
    expect(row.state$.getValue().draft).toEqual({ name: "Design" });

    row.intents.change({ name: "Research" });
    row.intents.save();

    expect(namesOf(app).categories).toEqual(["Engineering", "Research"]);

    row.dispose();
  });

  it("keeps on the category's row the reason it could not be deleted", () => {
    const app = createDirectoryApp();
    const row = app.machines.createCategoryRow("eng");

    row.intents.remove();

    expect(row.state$.getValue().refusal?.message).toBe('"Engineering" still has 1 user. Move or delete them first.');
    expect(namesOf(app).categories).toEqual(["Design", "Engineering"]);

    row.dispose();
  });

  it("deletes a category that has no users through its row", () => {
    const app = createDirectoryApp();
    const row = app.machines.createCategoryRow("design");

    row.intents.remove();

    expect(namesOf(app).categories).toEqual(["Engineering"]);

    row.dispose();
  });

  it("adds a user through the user form, and keeps a refusal next to that form", () => {
    const app = createDirectoryApp();
    const form = app.machines.createUserForm();

    form.intents.change({ name: "Grace", email: "ADA@example.com", categoryId: "design" });
    form.intents.save();
    expect(form.state$.getValue().refusal).toMatchObject({ reason: "duplicate-email", field: "email" });

    form.intents.change({ email: "grace@example.com" });
    form.intents.save();
    expect(namesOf(app).users).toEqual(["Ada", "Grace"]);

    form.dispose();
  });

  it("edits and deletes a user through their row", () => {
    const app = createDirectoryApp();
    const row = app.machines.createUserRow("ada");

    row.intents.edit();
    expect(row.state$.getValue().draft).toEqual({ name: "Ada", email: "ada@example.com", categoryId: "eng" });

    row.intents.change({ name: "Ada Lovelace" });
    row.intents.save();
    expect(namesOf(app).users).toEqual(["Ada Lovelace"]);

    row.intents.remove();
    expect(namesOf(app).users).toEqual([]);

    row.dispose();
  });
});

const SEED: DirectorySnapshot = {
  categories: [
    { id: "eng", name: "Engineering" },
    { id: "design", name: "Design" },
  ],
  users: [{ id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: true }],
};

/** The application on a small directory, with a reader on the directory screen until the test ends. */
function createDirectoryApp(): App {
  const app = createApp({ price: { prices: () => new Subject<Price>() }, directory: createDirectorySimulator(SEED) });
  const subscription = app.presenters.directory.view$.subscribe();

  onTestFinished(() => {
    subscription.unsubscribe();
  });

  return app;
}

function namesOf(app: App): { categories: string[]; users: string[] } {
  const view = app.presenters.directory.view$.getValue();

  return {
    categories: view.categories.map((category) => category.name),
    users: view.users.map((user) => user.name),
  };
}
