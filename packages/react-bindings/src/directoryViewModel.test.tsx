import { describe, expect, it } from "vitest";

import { mountDirectoryUnderProvider } from "./directoryViewModel.page.tsx";

describe("the view model's directory", () => {
  it("gives a component the categories and users, loaded", () => {
    const page = mountDirectoryUnderProvider();

    expect(page.status()).toBe("ready");
    expect(page.categoryNames()).toEqual(["Design", "Engineering"]);
    expect(page.userNames()).toEqual(["Ada"]);
  });

  it("gives a component a form that adds a category and is then blank", async () => {
    const page = mountDirectoryUnderProvider();

    await page.addCategory("Support");

    expect(page.categoryNames()).toEqual(["Design", "Engineering", "Support"]);
    expect(page.categoryForm()).toEqual({ name: "", refusal: null });
  });

  it("gives the form the reason a category was refused, with what was typed", async () => {
    const page = mountDirectoryUnderProvider();

    await page.addCategory("design");

    expect(page.categoryForm()).toEqual({
      name: "design",
      refusal: 'There is already a category called "design".',
    });
  });

  it("gives a component a form for one category, which renames it", async () => {
    const page = mountDirectoryUnderProvider();

    await page.renameFirstCategory("Research");

    expect(page.categoryNames()).toEqual(["Engineering", "Research"]);
    expect(page.openRows().category).toBe(false);
  });

  it("gives a component a form that adds a user", async () => {
    const page = mountDirectoryUnderProvider();

    await page.addUser("Grace", "ada@example.com");
    expect(page.userForm()).toEqual({
      name: "Grace",
      refusal: "Another user already has the email address ada@example.com.",
    });

    await page.addUser("Grace", "grace@example.com");
    expect(page.userNames()).toEqual(["Ada", "Grace"]);
  });

  it("gives a component a form for one user, which edits and deletes them", async () => {
    const page = mountDirectoryUnderProvider();

    await page.editFirstUser();
    expect(page.openRows().user).toBe(true);

    await page.removeFirstUser();
    expect(page.userNames()).toEqual([]);
  });

  it("lets a component narrow the users to a category, and load the lists again", async () => {
    const page = mountDirectoryUnderProvider();

    await page.showFirstCategory();
    expect(page.userNames()).toEqual([]);

    await page.reload();
    expect(page.status()).toBe("ready");
  });
});
