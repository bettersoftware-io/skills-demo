import { describe, expect, it } from "vitest";

import type { DirectorySnapshot } from "@skills-demo/domain";

import { mountUserList } from "./UserList.page.tsx";

describe("the user list", () => {
  it("lists the users in name order, each with their email address and category", () => {
    const page = mountUserList(DIRECTORY);

    expect(page.rows()).toEqual([
      "Ada, ada@example.com, Engineering",
      "Dieter, dieter@example.com, Design",
      "Grace, grace@example.com, Engineering",
    ]);
  });

  it("narrows the list to one category, and widens it again", async () => {
    const page = mountUserList(DIRECTORY);

    expect(page.categoryChoices()).toEqual([
      "All categories",
      "Design",
      "Engineering",
      "Operations",
    ]);

    await page.show("Engineering");
    expect(page.rows()).toEqual([
      "Ada, ada@example.com, Engineering",
      "Grace, grace@example.com, Engineering",
    ]);

    await page.show("Operations");
    expect(page.rows()).toEqual([]);

    await page.show("All categories");
    expect(page.rows()).toHaveLength(3);
  });

  it("adds a user, and clears the form for the next one", async () => {
    const page = mountUserList(DIRECTORY);

    await page.add({ name: "Linus", email: "linus@example.com", category: "Operations" });

    expect(page.rows()).toContain("Linus, linus@example.com, Operations");
    expect(page.newUser()).toEqual({ name: "", email: "", category: "Choose a category" });
    expect(page.refusalCount()).toBe(0);
  });

  it("says next to the add form that a user needs a name, and marks the field", async () => {
    const page = mountUserList(DIRECTORY);

    expect(page.invalidNewFields()).toEqual([]);

    await page.add({ email: "linus@example.com", category: "Operations" });

    expect(page.addRefusal()).toBe("A user needs a name.");
    expect(page.invalidNewFields()).toEqual(["name"]);
    expect(page.rows()).toHaveLength(3);
  });

  it("refuses an email address that does not look like one, and keeps what was typed", async () => {
    const page = mountUserList(DIRECTORY);

    await page.add({ name: "Linus", email: "linus.example.com", category: "Operations" });

    expect(page.addRefusal()).toBe("This does not look like an email address.");
    expect(page.invalidNewFields()).toEqual(["email"]);
    expect(page.newUser()).toEqual({
      name: "Linus",
      email: "linus.example.com",
      category: "Operations",
    });
    expect(page.rows()).toHaveLength(3);
  });

  it("refuses a user with no category chosen", async () => {
    const page = mountUserList(DIRECTORY);

    await page.add({ name: "Linus", email: "linus@example.com" });

    expect(page.addRefusal()).toBe("Choose a category.");
    expect(page.invalidNewFields()).toEqual(["category"]);
  });

  it("refuses an email address another user has, whatever its case", async () => {
    const page = mountUserList(DIRECTORY);

    await page.add({ name: "Other Ada", email: "ADA@example.com", category: "Design" });

    expect(page.addRefusal()).toBe("Another user already has the email address ADA@example.com.");
    expect(page.refusalCount()).toBe(1);
    expect(page.rows()).toHaveLength(3);
  });

  it("adds the user once the field that was refused is corrected, and drops the message", async () => {
    const page = mountUserList(DIRECTORY);

    await page.add({ name: "Linus", email: "linus", category: "Operations" });
    await page.add({ email: "linus@example.com" });

    expect(page.addRefusal()).toBeNull();
    expect(page.rows()).toContain("Linus, linus@example.com, Operations");
  });

  it("edits a user, starting from what they have now", async () => {
    const page = mountUserList(DIRECTORY);

    expect(await page.startEdit("Ada")).toEqual({
      name: "Ada",
      email: "ada@example.com",
      category: "Engineering",
    });

    await page.cancelEdit("Ada");
    await page.edit("Ada", { name: "Ada Lovelace", category: "Design" });

    expect(page.rows()).toContain("Ada Lovelace, ada@example.com, Design");
  });

  it("says on the row being edited why the change is refused, and nowhere else", async () => {
    const page = mountUserList(DIRECTORY);

    await page.edit("Grace", { email: "ada@example.com" });

    expect(page.refusalOn("Grace")).toBe(
      "Another user already has the email address ada@example.com.",
    );
    expect(page.addRefusal()).toBeNull();
    expect(page.refusalCount()).toBe(1);
  });

  it("leaves the user alone when the edit is cancelled", async () => {
    const page = mountUserList(DIRECTORY);

    await page.startEdit("Grace");
    await page.cancelEdit("Grace");

    expect(page.rows()).toContain("Grace, grace@example.com, Engineering");
  });

  it("deletes a user", async () => {
    const page = mountUserList(DIRECTORY);

    await page.remove("Dieter");

    expect(page.rows()).toEqual([
      "Ada, ada@example.com, Engineering",
      "Grace, grace@example.com, Engineering",
    ]);
  });

  it("says on the user's row when someone else has already deleted them", async () => {
    const page = mountUserList(DIRECTORY);

    page.removeBehindTheScreen("dieter");
    await page.remove("Dieter");

    expect(page.refusalOn("Dieter")).toBe("This user no longer exists.");
  });
});

const DIRECTORY: DirectorySnapshot = {
  categories: [
    { id: "ops", name: "Operations" },
    { id: "eng", name: "Engineering" },
    { id: "design", name: "Design" },
  ],
  users: [
    { id: "grace", name: "Grace", email: "grace@example.com", categoryId: "eng" },
    { id: "dieter", name: "Dieter", email: "dieter@example.com", categoryId: "design" },
    { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng" },
  ],
};
