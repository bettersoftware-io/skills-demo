import { describe, expect, it } from "vitest";

import { REFUSAL_REASONS } from "@skills-demo/domain";

import {
  API_PATH,
  encodeCategory,
  encodeCategoryDraft,
  encodeRefusal,
  encodeUser,
  encodeUserDraft,
  locateEntry,
  parseCategory,
  parseCategoryList,
  parseRefusal,
  parseUser,
  parseUserList,
  REFUSAL_STATUS,
  readCategoryDraft,
  readUserDraft,
} from "./directoryProtocol.ts";

describe("the directory protocol", () => {
  it("carries a category and a user to the wire and back unchanged", () => {
    expect(parseCategory(overTheWire(encodeCategory(DESIGN)))).toEqual(DESIGN);
    expect(parseUser(overTheWire(encodeUser(ADA)))).toEqual(ADA);
  });

  it("carries a list to the wire and back unchanged, an empty one included", () => {
    expect(
      parseCategoryList(overTheWire([DESIGN].map(encodeCategory))),
    ).toEqual([DESIGN]);
    expect(parseUserList(overTheWire([ADA, ADA].map(encodeUser)))).toEqual([
      ADA,
      ADA,
    ]);
    expect(parseUserList(overTheWire([]))).toEqual([]);
  });

  it("carries a draft to the wire and back unchanged", () => {
    const draft = {
      name: "Ada",
      email: "ada@example.com",
      categoryId: "design",
    };

    expect(
      readCategoryDraft(overTheWire(encodeCategoryDraft({ name: "Design" }))),
    ).toEqual({
      name: "Design",
    });
    expect(readUserDraft(overTheWire(encodeUserDraft(draft)))).toEqual(draft);
  });

  it("carries a refusal to the wire and back unchanged, with or without a field", () => {
    const aboutAField = {
      reason: "empty-name",
      field: "name",
      message: "A category needs a name.",
    } as const;

    const aboutTheChange = {
      reason: "category-in-use",
      field: null,
      message: "It still has users.",
    } as const;

    expect(parseRefusal(overTheWire(encodeRefusal(aboutAField)))).toEqual(
      aboutAField,
    );
    expect(parseRefusal(overTheWire(encodeRefusal(aboutTheChange)))).toEqual(
      aboutTheChange,
    );
  });

  it("rejects anything that is not a category or a user", () => {
    expect(parseCategory(null)).toBeUndefined();
    expect(parseCategory({ id: "design" })).toBeUndefined();
    expect(parseCategory({ id: 1, name: "Design" })).toBeUndefined();
    expect(parseUser("ada")).toBeUndefined();
    expect(parseUser({ ...ADA, id: 1 })).toBeUndefined();
    expect(parseUser({ ...ADA, name: undefined })).toBeUndefined();
    expect(parseUser({ ...ADA, email: null })).toBeUndefined();
    expect(parseUser({ ...ADA, categoryId: 7 })).toBeUndefined();
  });

  it("rejects a list with anything else in it, and anything that is not a list", () => {
    expect(parseCategoryList([DESIGN, { id: "broken" }])).toBeUndefined();
    expect(parseCategoryList({ categories: [] })).toBeUndefined();
    expect(parseUserList([ADA, null])).toBeUndefined();
  });

  it("rejects an error body it does not know", () => {
    const error = {
      reason: "empty-name",
      field: "name",
      message: "A category needs a name.",
    };

    expect(parseRefusal(null)).toBeUndefined();
    expect(parseRefusal({ message: "Not Found" })).toBeUndefined();
    expect(
      parseRefusal({ error: { ...error, reason: "teapot" } }),
    ).toBeUndefined();
    expect(
      parseRefusal({ error: { ...error, field: "phone" } }),
    ).toBeUndefined();
    expect(
      parseRefusal({ error: { ...error, field: undefined } }),
    ).toBeUndefined();
    expect(parseRefusal({ error: { ...error, message: 42 } })).toBeUndefined();
  });

  it("reads a body with missing or wrong fields as a blank draft, for the rules to refuse", () => {
    expect(readCategoryDraft(null)).toEqual({ name: "" });
    expect(readCategoryDraft({ name: 42 })).toEqual({ name: "" });
    expect(readUserDraft("not json")).toEqual({
      name: "",
      email: "",
      categoryId: "",
    });
    expect(readUserDraft({ name: "Ada", email: ["ada@example.com"] })).toEqual({
      name: "Ada",
      email: "",
      categoryId: "",
    });
  });

  it("gives every refusal a status that says the request failed", () => {
    for (const reason of REFUSAL_REASONS) {
      expect(REFUSAL_STATUS[reason]).toBeGreaterThanOrEqual(400);
    }

    expect(REFUSAL_STATUS["not-found"]).toBe(404);
    expect(REFUSAL_STATUS["duplicate-name"]).toBe(409);
    expect(REFUSAL_STATUS["invalid-email"]).toBe(422);
  });

  it("locates one entry under its collection, whatever its id contains", () => {
    expect(locateEntry(API_PATH.categories, "design")).toBe(
      "/api/categories/design",
    );
    expect(locateEntry(API_PATH.users, "a/b c")).toBe("/api/users/a%2Fb%20c");
  });
});

const DESIGN = { id: "design", name: "Design" };

const ADA = {
  id: "ada",
  name: "Ada",
  email: "ada@example.com",
  categoryId: "design",
};

/** What the other side receives: the value as JSON text, parsed again. */
function overTheWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}
