import type { AppPorts } from "@skills-demo/client-core";
import { type Category, type Price, SEED_DIRECTORY } from "@skills-demo/domain";
import { installFakeWebSocket } from "@skills-demo/client-core/testing/fakeWebSocket.ts";
import { describe, expect, it, onTestFinished, vi } from "vitest";

import { buildPorts } from "./buildPorts.ts";

describe("choosing what stands behind the ports", () => {
  it("runs on the simulator when there is no server URL", () => {
    const said = silenceInfo();
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const received: Price[] = [];

    const subscription = buildPorts(undefined)
      .price.prices()
      .subscribe((price) => received.push(price));
    vi.advanceTimersByTime(500);
    subscription.unsubscribe();

    expect(received).toHaveLength(1);
    expect(said).toHaveBeenCalledWith("[data] composed sim: no VITE_SERVER_URL");
  });

  it("connects to the server when there is one", () => {
    const said = silenceInfo();
    const network = installFakeWebSocket();
    onTestFinished(network.restore);

    const subscription = buildPorts("ws://example.test/ws").price.prices().subscribe();
    subscription.unsubscribe();

    expect(network.sockets.map((socket) => socket.url)).toEqual(["ws://example.test/ws"]);
    expect(said).toHaveBeenCalledWith("[data] composed live from ws://example.test/ws");
  });

  it("keeps the directory in the browser when there is no API URL", () => {
    const said = silenceInfo();
    let names: string[] = [];

    buildPorts(undefined)
      .directory.categories()
      .subscribe((categories) => {
        names = categories.map((category) => category.name);
      });

    expect(names).toEqual(SEED_DIRECTORY.categories.map((category) => category.name));
    expect(said).toHaveBeenCalledWith("[directory] composed sim: no VITE_API_URL");
  });

  it("asks the server for the directory when there is an API URL, whatever the price source", async () => {
    const said = silenceInfo();
    const fetched = vi.fn(async () => new Response(JSON.stringify([{ id: "design", name: "Design" }])));
    vi.stubGlobal("fetch", fetched);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    const categories = await firstCategories(buildPorts(undefined, "http://example.test"));

    expect(categories).toEqual([{ id: "design", name: "Design" }]);
    expect(fetched).toHaveBeenCalledWith("http://example.test/api/categories", expect.objectContaining({ method: "GET" }));
    expect(said).toHaveBeenCalledWith("[directory] composed live from http://example.test");
    expect(said).toHaveBeenCalledWith("[data] composed sim: no VITE_SERVER_URL");
  });
});

/** The first answer of the directory port's category list. The package has no stream library to do this with. */
function firstCategories(ports: AppPorts): Promise<Category[]> {
  return new Promise((resolve, reject) => {
    ports.directory.categories().subscribe({ next: resolve, error: reject });
  });
}

/** The composition says which source it chose; a test reads that instead of printing it. */
function silenceInfo(): ReturnType<typeof vi.spyOn> {
  const said = vi.spyOn(console, "info").mockImplementation(() => {});

  onTestFinished(() => {
    said.mockRestore();
  });

  return said;
}
