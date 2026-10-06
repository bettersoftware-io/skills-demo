import { expect, test } from "#/testing/test.ts";

// The server keeps one directory for the whole run and the tests run side by
// side, so each test works on a user or a category of its own, by a name no
// other test uses. None of them counts on what the others have left.
test.describe("the users and categories, against the real server", () => {
  test("adds a user, and the server is the one that keeps them", async ({
    directory,
    directoryApi,
  }) => {
    const katherine = {
      name: "Katherine Johnson",
      email: "katherine@example.com",
      category: "Engineering",
    };

    await directory.open();
    await directory.addUser(katherine);

    await expect.poll(directory.users).toContainEqual(katherine);
    expect(directoryApi.exchanges()).toContain("POST /api/users 201");

    // Read off the network on one side and off the screen on the other. A
    // client that fell back to its simulator would ask the server nothing,
    // and its rows would match nothing the server answered.
    await expect(async () => {
      expect(await directoryApi.latestUsers()).toContainEqual(katherine);
      expect(await directory.users()).toEqual(await directoryApi.latestUsers());
    }).toPass();

    // A page loaded afresh has nothing of its own, and still shows her.
    await directory.reopen();
    await expect.poll(directory.users).toContainEqual(katherine);
  });

  test("changes a user's name and category, on the server", async ({
    directory,
    directoryApi,
  }) => {
    const alan = {
      name: "Alan Turing",
      email: "alan@example.com",
      category: "Engineering",
    };
    const changed = { ...alan, name: "Alan M. Turing", category: "Design" };

    await directory.open();
    await directory.addUser(alan);
    await expect.poll(directory.users).toContainEqual(alan);

    await directory.changeUser(alan.name, {
      name: changed.name,
      category: changed.category,
    });

    await expect.poll(directory.users).toContainEqual(changed);
    expect(await directory.users()).not.toContainEqual(alan);
    expect(directoryApi.exchanges()).toContainEqual(
      expect.stringMatching(/^PUT \/api\/users\/\S+ 200$/),
    );

    await directory.reopen();
    await expect.poll(directory.users).toContainEqual(changed);
    expect(await directory.users()).not.toContainEqual(alan);
  });

  test("deletes a user, on the server", async ({ directory, directoryApi }) => {
    const margaret = {
      name: "Margaret Hamilton",
      email: "margaret@example.com",
      category: "Support",
    };

    await directory.open();
    await directory.addUser(margaret);
    await expect.poll(directory.users).toContainEqual(margaret);

    await directory.deleteUser(margaret.name);

    await expect.poll(directory.users).not.toContainEqual(margaret);
    expect(directoryApi.exchanges()).toContainEqual(
      expect.stringMatching(/^DELETE \/api\/users\/\S+ 204$/),
    );

    await directory.reopen();
    await expect.poll(directory.users).not.toEqual([]);
    expect(await directory.users()).not.toContainEqual(margaret);
  });

  test("keeps a category that still has users, with the server's reason, and lets it go once it is empty", async ({
    directory,
    directoryApi,
  }) => {
    const barbara = {
      name: "Barbara Liskov",
      email: "barbara@example.com",
      category: "Research",
    };

    await directory.open();
    await directory.addCategory("Research");
    await expect
      .poll(() => {
        return directory.categoryNamed("Research");
      })
      .toMatchObject({ users: "0 users" });
    await directory.addUser(barbara);
    await expect
      .poll(() => {
        return directory.categoryNamed("Research");
      })
      .toMatchObject({ users: "1 user" });

    await directory.deleteCategory("Research");

    await expect
      .poll(() => {
        return directory.categoryNamed("Research");
      })
      .toMatchObject({
        refusal: '"Research" still has 1 user. Move or delete them first.',
      });
    expect(directoryApi.exchanges()).toContainEqual(
      expect.stringMatching(/^DELETE \/api\/categories\/\S+ 409$/),
    );

    // The refusal was the server's, and so is the category: it is still
    // there for a page that never asked to delete it.
    await directory.reopen();
    await expect
      .poll(() => {
        return directory.categoryNamed("Research");
      })
      .toMatchObject({ users: "1 user", refusal: null });

    await directory.deleteUser(barbara.name);
    await expect
      .poll(() => {
        return directory.categoryNamed("Research");
      })
      .toMatchObject({ users: "0 users" });
    await directory.deleteCategory("Research");

    await expect
      .poll(() => {
        return directory.categoryNamed("Research");
      })
      .toBeNull();
    expect(directoryApi.exchanges()).toContainEqual(
      expect.stringMatching(/^DELETE \/api\/categories\/\S+ 204$/),
    );
  });
});
