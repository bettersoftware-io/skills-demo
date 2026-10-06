import { expect, test } from "#/testing/test.ts";

test.describe("the users and categories, on the simulator", () => {
  test("lists the directory the browser starts with, adds a user to it, and asks no server", async ({
    directory,
    directoryApi,
  }) => {
    const katherine = {
      name: "Katherine Johnson",
      email: "katherine@example.com",
      category: "Design",
    };

    await directory.open();
    await expect.poll(directory.users).not.toEqual([]);
    expect(await directory.users()).not.toContainEqual(katherine);

    await directory.addUser(katherine);

    await expect.poll(directory.users).toContainEqual(katherine);
    expect(directoryApi.exchanges()).toEqual([]);
    expect(directoryApi.requestsElsewhere()).toEqual([]);
  });

  test("keeps a category that still has users, and says why", async ({
    directory,
  }) => {
    await directory.open();
    await expect
      .poll(() => {
        return directory.categoryNamed("Engineering");
      })
      .toMatchObject({ users: "2 users", refusal: null });

    await directory.deleteCategory("Engineering");

    await expect
      .poll(() => {
        return directory.categoryNamed("Engineering");
      })
      .toMatchObject({
        users: "2 users",
        refusal: '"Engineering" still has 2 users. Move or delete them first.',
      });
  });
});
