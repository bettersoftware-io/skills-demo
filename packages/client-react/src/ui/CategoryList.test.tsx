import type { DirectorySnapshot } from "@skills-demo/domain";
import { describe, expect, it } from "vitest";

import { mountCategoryList } from "./CategoryList.page.tsx";

describe("the category list", () => {
  it("lists the categories in name order, each with how many users it has", () => {
    const page = mountCategoryList(DIRECTORY);

    expect(page.rows()).toEqual(["Design, 1 user", "Engineering, 2 users", "Operations, 0 users"]);
  });

  it("adds a category, and clears the field for the next one", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.add("Billing");

    expect(page.rows()).toEqual(["Billing, 0 users", "Design, 1 user", "Engineering, 2 users", "Operations, 0 users"]);
    expect(page.newName()).toBe("");
    expect(page.refusalCount()).toBe(0);
  });

  it("says next to the add form that a category needs a name, and marks the field", async () => {
    const page = mountCategoryList(DIRECTORY);

    expect(page.newNameIsMarkedInvalid()).toBe(false);

    await page.add("");

    expect(page.addRefusal()).toBe("A category needs a name.");
    expect(page.newNameIsMarkedInvalid()).toBe(true);
    expect(page.refusalCount()).toBe(1);
    expect(page.rows()).toHaveLength(3);
  });

  it("refuses a name another category has, whatever its case, and keeps what was typed", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.add("design");

    expect(page.addRefusal()).toBe('There is already a category called "design".');
    expect(page.newName()).toBe("design");
    expect(page.rows()).toHaveLength(3);
  });

  it("renames a category", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.rename("Operations", "Support");

    expect(page.rows()).toEqual(["Design, 1 user", "Engineering, 2 users", "Support, 0 users"]);
  });

  it("says on the row being renamed why its new name is refused, and nowhere else", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.rename("Operations", "ENGINEERING");

    expect(page.refusalOn("Operations")).toBe('There is already a category called "ENGINEERING".');
    expect(page.addRefusal()).toBeNull();
    expect(page.refusalCount()).toBe(1);
  });

  it("refuses to rename a category to nothing", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.rename("Operations", "");

    expect(page.refusalOn("Operations")).toBe("A category needs a name.");
  });

  it("leaves the name alone when the rename is cancelled", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.typeRename("Operations", "Support");
    await page.cancelRename("Operations");

    expect(page.rows()).toContain("Operations, 0 users");
  });

  it("deletes a category that has no users", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.remove("Operations");

    expect(page.rows()).toEqual(["Design, 1 user", "Engineering, 2 users"]);
  });

  it("keeps a category that still has users, and says why on its row and nowhere else", async () => {
    const page = mountCategoryList(DIRECTORY);

    await page.remove("Engineering");

    expect(page.rows()).toHaveLength(3);
    expect(page.refusalOn("Engineering")).toBe('"Engineering" still has 2 users. Move or delete them first.');
    expect(page.addRefusal()).toBeNull();
    expect(page.refusalCount()).toBe(1);
  });
});

const DIRECTORY: DirectorySnapshot = {
  categories: [
    { id: "ops", name: "Operations" },
    { id: "eng", name: "Engineering" },
    { id: "design", name: "Design" },
  ],
  users: [
    { id: "grace", name: "Grace", email: "grace@example.com", categoryId: "eng", active: true },
    { id: "dieter", name: "Dieter", email: "dieter@example.com", categoryId: "design", active: true },
    { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: true },
  ],
};
