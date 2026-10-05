import { firstValueFrom } from "rxjs";
import { describe, expect, it, onTestFinished, vi } from "vitest";

import { createDirectorySimulator, type DirectoryPort } from "@skills-demo/domain";

import {
  createFakeDirectoryServer,
  type FakeDirectoryServer,
} from "../testing/fakeDirectoryServer.ts";
import { createHttpDirectoryPort } from "./httpDirectory.ts";

describe("the HTTP directory adapter", () => {
  it("sends each call to its own route of the REST API", async () => {
    const { port, server } = createConnected();

    await firstValueFrom(port.categories());
    await firstValueFrom(port.users());
    await firstValueFrom(port.addCategory({ name: "Design" }));
    await firstValueFrom(port.renameCategory("eng", { name: "Engineers" }));
    await firstValueFrom(port.removeCategory("a/b"));
    await firstValueFrom(port.addUser(GRACE));
    await firstValueFrom(port.changeUser("ada", GRACE));
    await firstValueFrom(port.removeUser("ada"));

    expect(server.requests).toEqual([
      "GET http://example.test/api/categories",
      "GET http://example.test/api/users",
      "POST http://example.test/api/categories",
      "PUT http://example.test/api/categories/eng",
      "DELETE http://example.test/api/categories/a%2Fb",
      "POST http://example.test/api/users",
      "PUT http://example.test/api/users/ada",
      "DELETE http://example.test/api/users/ada",
    ]);
  });

  it("takes a server URL with or without a slash at its end", async () => {
    const server = createFakeDirectoryServer(createDirectorySimulator(SEED), SERVER_URL);

    await firstValueFrom(createHttpDirectoryPort(`${SERVER_URL}//`, server.send).categories());

    expect(server.requests).toEqual(["GET http://example.test/api/categories"]);
  });

  it("uses the browser's fetch when it is given nothing else, and says the body is JSON", async () => {
    const fetched = vi.fn(
      async () => new Response(JSON.stringify({ id: "design", name: "Design" }), { status: 201 }),
    );

    vi.stubGlobal("fetch", fetched);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    const outcome = await firstValueFrom(
      createHttpDirectoryPort(SERVER_URL).addCategory({ name: "Design" }),
    );

    expect(outcome).toEqual({ accepted: true, value: { id: "design", name: "Design" } });
    expect(fetched).toHaveBeenCalledWith("http://example.test/api/categories", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: '{"name":"Design"}',
    });
  });

  it("refuses a change as unavailable when the server cannot be reached", async () => {
    const { port, server } = createConnected();

    server.goDown();

    expect(await firstValueFrom(port.addCategory({ name: "Design" }))).toEqual({
      accepted: false,
      refusal: {
        reason: "unavailable",
        field: null,
        message: "The server could not be reached. Try again.",
      },
    });
    expect(await firstValueFrom(port.removeUser("ada"))).toMatchObject({
      refusal: { reason: "unavailable" },
    });
  });

  it("fails a list when the server cannot be reached", async () => {
    const { port, server } = createConnected();

    server.goDown();

    await expect(firstValueFrom(port.categories())).rejects.toThrow("Failed to fetch");
  });

  it("fails a list the server answers with an error, or with something that is not a list", async () => {
    const { port, server } = createConnected();

    server.answerNextWith(500, { error: "boom" });
    await expect(firstValueFrom(port.users())).rejects.toThrow(
      "the directory answered 500 to GET /api/users with no list the app understands",
    );

    server.answerNextWith(200, { users: [] });
    await expect(firstValueFrom(port.users())).rejects.toThrow("the directory answered 200");
  });

  it("refuses a change the server answers with an error the protocol does not know", async () => {
    const { port, server } = createConnected();
    const notUnderstood = {
      accepted: false,
      refusal: {
        reason: "unavailable",
        field: null,
        message: "The server gave an answer the app does not understand.",
      },
    };

    server.answerNextWith(502, "<html>Bad Gateway</html>");
    expect(await firstValueFrom(port.addUser(GRACE))).toEqual(notUnderstood);

    server.answerNextWith(400, undefined);
    expect(await firstValueFrom(port.removeCategory("eng"))).toEqual(notUnderstood);
  });

  it("refuses a change the server says it made but answers with something else", async () => {
    const { port, server } = createConnected();

    server.answerNextWith(201, { ok: true });

    expect(await firstValueFrom(port.addCategory({ name: "Design" }))).toMatchObject({
      accepted: false,
      refusal: { message: "The server gave an answer the app does not understand." },
    });
  });
});

const SERVER_URL = "http://example.test";

const SEED = {
  categories: [{ id: "eng", name: "Engineering" }],
  users: [{ id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng" }],
};

const GRACE = { name: "Grace", email: "grace@example.com", categoryId: "eng" };

interface Connected {
  port: DirectoryPort;
  server: FakeDirectoryServer;
}

/** The adapter on a fake server that holds one category with one user in it. */
function createConnected(): Connected {
  const server = createFakeDirectoryServer(createDirectorySimulator(SEED), SERVER_URL);

  return { port: createHttpDirectoryPort(SERVER_URL, server.send), server };
}
