import { createDirectorySimulator, createPriceSimulator } from "@skills-demo/domain";
import { API_ROOT, WS_PATH } from "@skills-demo/shared";

import { type RunningServer, startServer } from "./startServer.ts";

// The server's composition root: read the configuration, pick the sources,
// start. The directory is kept in memory, so it starts again from its few
// categories and users each time the server does.
const server: RunningServer = await startServer({
  port: Number(process.env.PORT ?? 4000),
  prices: createPriceSimulator(),
  directory: createDirectorySimulator(),
});

console.info(`price server listening on ws://localhost:${server.port}${WS_PATH}`);
console.info(`directory API listening on http://localhost:${server.port}${API_ROOT}`);
