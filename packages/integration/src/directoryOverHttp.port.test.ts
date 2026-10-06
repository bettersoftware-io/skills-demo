import { firstValueFrom } from "rxjs";
import { describe, expect, it, onTestFinished } from "vitest";

import { createHttpDirectoryPort } from "@skills-demo/client-core";
import {
  createDirectorySimulator,
  createPriceSimulator,
} from "@skills-demo/domain";
import { startServer } from "@skills-demo/server/startServer.ts";

// The contract runs against the real routes in `directoryOverHttp.test.ts`,
// in-process. These go over a real connection, so they need a port.

// Once over a real connection, with the `fetch` the app uses, for what an
// in-process request cannot show: a real body, and a real answer with none.
describe("the HTTP adapter against the running server", () => {
  it("makes a change and reads it back", async () => {
    const port = createHttpDirectoryPort(await startServerOnFreePort());

    const added = await firstValueFrom(port.addCategory({ name: "Legal" }));
    const listed = await firstValueFrom(port.categories());

    expect(added).toEqual({
      accepted: true,
      value: { id: expect.any(String), name: "Legal" },
    });
    expect(
      listed.map((category) => {
        return category.name;
      }),
    ).toContain("Legal");
  });

  it("reads a deletion, which is answered with no body, as accepted", async () => {
    const port = createHttpDirectoryPort(await startServerOnFreePort());
    const [first] = await firstValueFrom(port.users());

    expect(await firstValueFrom(port.removeUser(first.id))).toEqual({
      accepted: true,
      value: null,
    });
  });
});

/** The address of a real server on a free port, on the seed data. It is closed when the test ends. */
async function startServerOnFreePort(): Promise<string> {
  const server = await startServer({
    port: 0,
    prices: createPriceSimulator(),
    directory: createDirectorySimulator(),
  });

  onTestFinished(() => {
    return server.close();
  });

  return `http://localhost:${server.port}`;
}
