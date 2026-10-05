import { describe, expect, it } from "vitest";

import type { Category, Outcome } from "../entities/directory.ts";
import { createDirectorySimulator, SEED_DIRECTORY } from "./directorySimulator.ts";

describe("the directory simulator", () => {
  it("starts with a few categories and users when it is given none", () => {
    const directory = createDirectorySimulator();
    let categories: Category[] = [];

    directory.categories().subscribe((listed) => {
      categories = listed;
    });

    expect(categories).toEqual(SEED_DIRECTORY.categories);
    expect(categories.length).toBeGreaterThan(1);
    expect(SEED_DIRECTORY.users.length).toBeGreaterThan(1);
  });

  it("answers before subscribe returns, so a screen on it never waits", () => {
    const directory = createDirectorySimulator({ categories: [], users: [] });
    let outcome: Outcome<Category> | undefined;

    directory.addCategory({ name: "Design" }).subscribe((answered) => {
      outcome = answered;
    });

    expect(outcome).toEqual({ accepted: true, value: { id: "category-1", name: "Design" } });
  });

  it("never issues an id that something it was seeded with already has", () => {
    const directory = createDirectorySimulator({ categories: [{ id: "category-1", name: "Design" }], users: [] });
    let outcome: Outcome<Category> | undefined;

    directory.addCategory({ name: "Support" }).subscribe((answered) => {
      outcome = answered;
    });

    expect(outcome).toEqual({ accepted: true, value: { id: "category-2", name: "Support" } });
  });

  it("keeps its own copy, so a change does not reach the seed it was given", () => {
    const seed = { categories: [{ id: "design", name: "Design" }], users: [] };
    const directory = createDirectorySimulator(seed);

    directory.renameCategory("design", { name: "Research" }).subscribe();

    expect(seed.categories).toEqual([{ id: "design", name: "Design" }]);
  });
});
