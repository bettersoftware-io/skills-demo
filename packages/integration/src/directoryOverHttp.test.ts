import { createHttpDirectoryPort } from "@skills-demo/client-core";
import { createDirectorySimulator, createPriceSimulator } from "@skills-demo/domain";
import { describeDirectoryPortContract } from "@skills-demo/domain/ports/__contracts__/DirectoryPortContract.ts";
import { createDirectoryApi } from "@skills-demo/server/directoryApi.ts";
import { startServer } from "@skills-demo/server/startServer.ts";
import { firstValueFrom } from "rxjs";
import { describe, expect, it, onTestFinished } from "vitest";

// The adapter's own tests run it against a fake server, and the API's own
// tests call the routes by hand. Each repeats the route table, so the two can
// drift apart with every test green. Here the adapter's requests go to the
// real routes.

// The whole contract, with no socket: Hono answers a request in-process.
describeDirectoryPortContract("the HTTP adapter against the real API", (seed) => {
  const api = createDirectoryApi(createDirectorySimulator(seed));

  return {
    port: createHttpDirectoryPort("http://directory.test", (url, request) =>
      Promise.resolve(api.request(url, request)),
    ),
    teardown: (): void => {},
  };
});

// Once over a real connection, with the `fetch` the app uses, for what an
// in-process request cannot show: a real body, and a real answer with none.
describe("the HTTP adapter against the running server", () => {
  it("makes a change and reads it back", async () => {
    const port = createHttpDirectoryPort(await startServerOnFreePort());

    const added = await firstValueFrom(port.addCategory({ name: "Legal" }));
    const listed = await firstValueFrom(port.categories());

    expect(added).toEqual({ accepted: true, value: { id: expect.any(String), name: "Legal" } });
    expect(listed.map((category) => category.name)).toContain("Legal");
  });

  it("reads a deletion, which is answered with no body, as accepted", async () => {
    const port = createHttpDirectoryPort(await startServerOnFreePort());
    const [first] = await firstValueFrom(port.users());

    expect(await firstValueFrom(port.removeUser(first.id))).toEqual({ accepted: true, value: null });
  });
});

/** The address of a real server on a free port, on the seed data. It is closed when the test ends. */
async function startServerOnFreePort(): Promise<string> {
  const server = await startServer({
    port: 0,
    prices: createPriceSimulator(),
    directory: createDirectorySimulator(),
  });

  onTestFinished(() => server.close());

  return `http://localhost:${server.port}`;
}
