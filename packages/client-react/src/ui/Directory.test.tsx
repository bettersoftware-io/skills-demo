import { describe, expect, it } from "vitest";

import { mountDirectory } from "./Directory.page.tsx";

describe("the directory screen", () => {
  it("shows the categories and the users once they are loaded", () => {
    const page = mountDirectory("connected");

    expect(page.showsLists()).toBe(true);
    expect(page.status()).toBeNull();
  });

  it("says it is loading until the lists arrive", () => {
    const page = mountDirectory("unanswered");

    expect(page.status()).toBe("Loading users and categories…");
    expect(page.showsLists()).toBe(false);
  });

  it("says so when the lists could not be loaded, and loads them when asked again", async () => {
    const page = mountDirectory("unreachable");

    expect(page.status()).toBe("The users and categories could not be loaded.");
    expect(page.showsLists()).toBe(false);

    await page.tryAgainOnceReachable();

    expect(page.showsLists()).toBe(true);
  });
});
