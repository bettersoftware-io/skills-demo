import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { createAdaptorServer } from "@hono/node-server";
import { share } from "rxjs";
import { WebSocketServer } from "ws";

import type { DirectoryPort, PricePort } from "@skills-demo/domain";
import { encodePrice, WS_PATH } from "@skills-demo/shared";

import { createDirectoryApi } from "./directoryApi.ts";

export interface ServerOptions {
  /** 0 picks a free port. */
  port: number;
  prices: PricePort;
  directory: DirectoryPort;
}

export interface RunningServer {
  port: number;
  close: () => Promise<void>;
}

/**
 * One HTTP server with two faces: it streams prices to every WebSocket client,
 * and it serves the directory's REST API.
 *
 * All connections share one price feed, so every client sees the same prices;
 * the feed opens with the first client and closes when the last one leaves.
 *
 * The server takes its sources as ports, like the client does, so a test
 * drives it by hand and production runs it on the simulators.
 */
export function startServer({ port, prices, directory }: ServerOptions): Promise<RunningServer> {
  // The adaptor is given no options that would make it anything but a plain HTTP server.
  const http = createAdaptorServer({ fetch: createDirectoryApi(directory).fetch }) as Server;
  const server = new WebSocketServer({ server: http, path: WS_PATH });
  const prices$ = prices.prices().pipe(share());

  server.on("connection", (socket) => {
    const subscription = prices$.subscribe((price) => {
      socket.send(JSON.stringify(encodePrice(price)));
    });

    socket.on("close", () => {
      subscription.unsubscribe();
    });

    // Without a listener, one client's protocol error would end the process.
    socket.on("error", () => {
      socket.terminate();
    });
  });

  return new Promise((resolve, reject) => {
    // The WebSocket server passes on the HTTP server's errors and its "listening".
    server.once("error", reject);
    server.once("listening", () => {
      resolve({
        // A server listening on a TCP port always reports an address object.
        port: (http.address() as AddressInfo).port,
        close: () =>
          new Promise<void>((closed) => {
            for (const client of server.clients) {
              client.terminate();
            }

            server.close();
            http.close(() => {
              closed();
            });
          }),
      });
    });
    http.listen(port);
  });
}
