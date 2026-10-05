import { createDirectorySimulator, type DirectoryPort, type DirectorySnapshot } from "@skills-demo/domain";
import {
  API_PATH,
  encodeCategoryDraft,
  encodeUserDraft,
  locateEntry,
  parseCategory,
  parseCategoryList,
  parseRefusal,
  parseUser,
  parseUserList,
} from "@skills-demo/shared";
import { throwError } from "rxjs";
import { describe, expect, it } from "vitest";

import { createDirectoryApi } from "./directoryApi.ts";

describe("the directory API: categories", () => {
  it("lists the categories", async () => {
    const response = await createClient().get(API_PATH.categories);

    expect(response.status).toBe(200);
    expect(parseCategoryList(response.body)).toEqual(SEED.categories);
  });

  it("creates a category and answers 201 with it", async () => {
    const client = createClient();
    const response = await client.post(API_PATH.categories, encodeCategoryDraft({ name: " Design " }));
    const created = parseCategory(response.body);

    expect(response.status).toBe(201);
    expect(created?.name).toBe("Design");
    expect(parseCategoryList((await client.get(API_PATH.categories)).body)).toContainEqual(created);
  });

  it("answers 422 with the reason when the name is empty", async () => {
    const response = await createClient().post(API_PATH.categories, encodeCategoryDraft({ name: "" }));

    expect(response.status).toBe(422);
    expect(parseRefusal(response.body)).toEqual({
      reason: "empty-name",
      field: "name",
      message: "A category needs a name.",
    });
  });

  it("answers 409 when another category has the name, whatever its case", async () => {
    const response = await createClient().post(API_PATH.categories, encodeCategoryDraft({ name: "engineering" }));

    expect(response.status).toBe(409);
    expect(parseRefusal(response.body)?.reason).toBe("duplicate-name");
  });

  it("renames a category", async () => {
    const client = createClient();
    const response = await client.put(locateEntry(API_PATH.categories, "ops"), encodeCategoryDraft({ name: "Support" }));

    expect(response.status).toBe(200);
    expect(parseCategory(response.body)).toEqual({ id: "ops", name: "Support" });
    expect(parseCategoryList((await client.get(API_PATH.categories)).body)).toContainEqual({
      id: "ops",
      name: "Support",
    });
  });

  it("answers 404 when the category to rename or delete is not there", async () => {
    const client = createClient();
    const renamed = await client.put(locateEntry(API_PATH.categories, "sales"), encodeCategoryDraft({ name: "Sales" }));
    const removed = await client.delete(locateEntry(API_PATH.categories, "sales"));

    expect(renamed.status).toBe(404);
    expect(parseRefusal(renamed.body)?.message).toBe("This category no longer exists.");
    expect(removed.status).toBe(404);
  });

  it("deletes an empty category and answers 204 with no body", async () => {
    const client = createClient();
    const response = await client.delete(locateEntry(API_PATH.categories, "ops"));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(parseCategoryList((await client.get(API_PATH.categories)).body)).toEqual([SEED.categories[0]]);
  });

  it("answers 409 and says why when the category to delete still has users", async () => {
    const client = createClient();
    const response = await client.delete(locateEntry(API_PATH.categories, "eng"));

    expect(response.status).toBe(409);
    expect(parseRefusal(response.body)).toEqual({
      reason: "category-in-use",
      field: null,
      message: '"Engineering" still has 1 user. Move or delete them first.',
    });
    expect(parseCategoryList((await client.get(API_PATH.categories)).body)).toEqual(SEED.categories);
  });
});

describe("the directory API: users", () => {
  it("lists the users", async () => {
    const response = await createClient().get(API_PATH.users);

    expect(response.status).toBe(200);
    expect(parseUserList(response.body)).toEqual(SEED.users);
  });

  it("creates a user and answers 201 with them", async () => {
    const client = createClient();
    const response = await client.post(API_PATH.users, encodeUserDraft(GRACE));
    const created = parseUser(response.body);

    expect(response.status).toBe(201);
    expect(created).toMatchObject(GRACE);
    expect(parseUserList((await client.get(API_PATH.users)).body)).toContainEqual(created);
  });

  it("answers 422 when the email address does not look like one, or the category is not there", async () => {
    const client = createClient();
    const badEmail = await client.post(API_PATH.users, encodeUserDraft({ ...GRACE, email: "grace" }));
    const noCategory = await client.post(API_PATH.users, encodeUserDraft({ ...GRACE, categoryId: "sales" }));

    expect(badEmail.status).toBe(422);
    expect(parseRefusal(badEmail.body)).toMatchObject({ reason: "invalid-email", field: "email" });
    expect(noCategory.status).toBe(422);
    expect(parseRefusal(noCategory.body)).toMatchObject({ reason: "unknown-category", field: "category" });
  });

  it("answers 409 when another user has the email address, whatever its case", async () => {
    const response = await createClient().post(API_PATH.users, encodeUserDraft({ ...GRACE, email: "ADA@example.com" }));

    expect(response.status).toBe(409);
    expect(parseRefusal(response.body)).toMatchObject({ reason: "duplicate-email", field: "email" });
  });

  it("changes a user", async () => {
    const client = createClient();
    const moved = { name: "Ada Lovelace", email: "ada@example.com", categoryId: "ops" };
    const response = await client.put(locateEntry(API_PATH.users, "ada"), encodeUserDraft(moved));

    expect(response.status).toBe(200);
    expect(parseUser(response.body)).toEqual({ id: "ada", ...moved, active: true });
    expect(parseUserList((await client.get(API_PATH.users)).body)).toEqual([{ id: "ada", ...moved, active: true }]);
  });

  it("answers 404 when the user to change or delete is not there", async () => {
    const client = createClient();

    expect((await client.put(locateEntry(API_PATH.users, "grace"), encodeUserDraft(GRACE))).status).toBe(404);
    expect((await client.delete(locateEntry(API_PATH.users, "grace"))).status).toBe(404);
  });

  it("deletes a user and answers 204 with no body", async () => {
    const client = createClient();
    const response = await client.delete(locateEntry(API_PATH.users, "ada"));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(parseUserList((await client.get(API_PATH.users)).body)).toEqual([]);
  });
});

describe("the directory API: requests it cannot serve", () => {
  it("refuses a body that is not JSON, or has the wrong fields, as it refuses a blank form", async () => {
    const client = createClient();
    const notJson = await client.post(API_PATH.categories, "{ name: ");
    const wrongFields = await client.post(API_PATH.users, JSON.stringify({ name: 42 }));

    expect(notJson.status).toBe(422);
    expect(parseRefusal(notJson.body)?.reason).toBe("empty-name");
    expect(wrongFields.status).toBe(422);
    expect(parseRefusal(wrongFields.body)?.reason).toBe("empty-name");
  });

  it("answers 404 in the protocol's own words at an address it does not know", async () => {
    const response = await createClient().get("/api/teams");

    expect(response.status).toBe(404);
    expect(parseRefusal(response.body)).toEqual({
      reason: "not-found",
      field: null,
      message: "There is nothing at this address.",
    });
  });

  it("answers 503 when whatever keeps the data cannot be reached", async () => {
    const unreachable: DirectoryPort = {
      ...createDirectorySimulator(SEED),
      users: () => throwError(() => new Error("the database is down")),
    };
    const response = await createClient(unreachable).get(API_PATH.users);

    expect(response.status).toBe(503);
    expect(parseRefusal(response.body)?.reason).toBe("unavailable");
  });

  it("lets a page from another origin send a change", async () => {
    const response = await createDirectoryApi(createDirectorySimulator(SEED)).request(API_PATH.categories, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "PUT" },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET,POST,PUT,DELETE,PATCH");
  });
});

/** Two categories, one of them empty, and one user in the other. */
const SEED: DirectorySnapshot = {
  categories: [
    { id: "eng", name: "Engineering" },
    { id: "ops", name: "Operations" },
  ],
  users: [{ id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: true }],
};

const GRACE = { name: "Grace", email: "grace@example.com", categoryId: "ops" };

interface Answer {
  status: number;
  /** The body parsed as JSON, or null when there is none. */
  body: unknown;
}

interface Client {
  get: (path: string) => Promise<Answer>;
  post: (path: string, body: object | string) => Promise<Answer>;
  put: (path: string, body: object | string) => Promise<Answer>;
  delete: (path: string) => Promise<Answer>;
}

/** A client of the API on a directory of its own, with no socket in between. */
function createClient(directory: DirectoryPort = createDirectorySimulator(SEED)): Client {
  const api = createDirectoryApi(directory);

  async function send(method: string, path: string, body?: object | string): Promise<Answer> {
    const response = await api.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: typeof body === "object" ? JSON.stringify(body) : body,
    });
    const text = await response.text();

    return { status: response.status, body: text === "" ? null : JSON.parse(text) };
  }

  return {
    get: (path) => send("GET", path),
    post: (path, body) => send("POST", path, body),
    put: (path, body) => send("PUT", path, body),
    delete: (path) => send("DELETE", path),
  };
}
