import { describe, expect, it } from "vitest";

import type { Category, User } from "../entities/directory.ts";
import {
  checkCategoryDraft,
  checkUserDraft,
  judgeCategoryDraft,
  judgeCategoryRemoval,
  judgeUserDraft,
  tidyCategoryDraft,
  tidyUserDraft,
} from "./directoryRules.ts";

describe("a category draft", () => {
  it("is fine with a name", () => {
    expect(checkCategoryDraft({ name: "Design" })).toBeNull();
  });

  it("needs a name that is more than spaces", () => {
    expect(checkCategoryDraft({ name: "" })?.reason).toBe("empty-name");
    expect(checkCategoryDraft({ name: " \t" })?.field).toBe("name");
  });

  it("cannot take the name of another category, whatever the case or the spaces around it", () => {
    expect(judgeCategoryDraft({ name: " design " }, CATEGORIES)?.reason).toBe("duplicate-name");
    expect(judgeCategoryDraft({ name: "Research" }, CATEGORIES)).toBeNull();
  });

  it("is told it is empty before it is compared with the others", () => {
    expect(judgeCategoryDraft({ name: "" }, [{ id: "blank", name: "" }])?.reason).toBe("empty-name");
  });

  it("is stored without the spaces around it", () => {
    expect(tidyCategoryDraft({ name: "  Design " })).toEqual({ name: "Design" });
  });
});

describe("a user draft", () => {
  it("is fine with a name, an email address and a category", () => {
    expect(checkUserDraft(ADA)).toBeNull();
    expect(judgeUserDraft(ADA, [], CATEGORIES)).toBeNull();
  });

  it("needs a name", () => {
    expect(checkUserDraft({ ...ADA, name: "  " })?.reason).toBe("empty-name");
  });

  it.each(["", "ada", "ada@", "@example.com", "ada@example", "ada lovelace@example.com", "ada@@example.com"])(
    "refuses %j as an email address",
    (email) => {
      expect(checkUserDraft({ ...ADA, email })).toMatchObject({ reason: "invalid-email", field: "email" });
    },
  );

  it.each(["ada@example.com", " ada@example.com ", "ada.lovelace+tag@mail.example.co.uk"])(
    "accepts %j as an email address",
    (email) => {
      expect(checkUserDraft({ ...ADA, email })).toBeNull();
    },
  );

  it("needs a category to have been chosen", () => {
    expect(checkUserDraft({ ...ADA, categoryId: "" })).toEqual({
      reason: "unknown-category",
      field: "category",
      message: "Choose a category.",
    });
  });

  it("needs its category to exist", () => {
    expect(judgeUserDraft({ ...ADA, categoryId: "sales" }, [], CATEGORIES)?.reason).toBe("unknown-category");
  });

  it("cannot take the email address of another user, whatever the case", () => {
    const others: User[] = [{ id: "ada", ...ADA }];

    expect(judgeUserDraft({ ...ADA, name: "Other", email: " ADA@EXAMPLE.COM " }, others, CATEGORIES)?.reason).toBe(
      "duplicate-email",
    );
  });

  it("is told about its own flaws before it is compared with the others", () => {
    const others: User[] = [{ id: "ada", ...ADA }];

    expect(judgeUserDraft({ ...ADA, name: "" }, others, CATEGORIES)?.reason).toBe("empty-name");
  });

  it("is stored without the spaces around its name and email address", () => {
    expect(tidyUserDraft({ name: " Ada ", email: " ada@example.com ", categoryId: "design" })).toEqual(ADA);
  });
});

describe("deleting a category", () => {
  it("is allowed when no user is in it", () => {
    expect(judgeCategoryRemoval(DESIGN, [{ id: "ada", ...ADA, categoryId: "support" }])).toBeNull();
  });

  it("is refused while one user is in it, counted in the singular", () => {
    expect(judgeCategoryRemoval(DESIGN, [{ id: "ada", ...ADA }])).toEqual({
      reason: "category-in-use",
      field: null,
      message: '"Design" still has 1 user. Move or delete them first.',
    });
  });

  it("is refused while several users are in it, counted in the plural", () => {
    const members: User[] = [
      { id: "ada", ...ADA },
      { id: "grace", ...ADA, email: "grace@example.com" },
    ];

    expect(judgeCategoryRemoval(DESIGN, members)?.message).toBe(
      '"Design" still has 2 users. Move or delete them first.',
    );
  });
});

const DESIGN: Category = { id: "design", name: "Design" };

const CATEGORIES: Category[] = [DESIGN, { id: "support", name: "Support" }];

const ADA = { name: "Ada", email: "ada@example.com", categoryId: "design" };
