import {
  type AppPorts,
  createHttpDirectoryPort,
  createWsConnection,
  createWsPricePort,
} from "@skills-demo/client-core";
import {
  createDirectorySimulator,
  createPriceSimulator,
  type DirectoryPort,
  type PricePort,
} from "@skills-demo/domain";

/**
 * Picks what stands behind each port. This is the only place that chooses an
 * adapter. Each port is chosen on its own: with its server's URL it talks to
 * the server, without one it runs on its simulator.
 */
export function buildPorts(serverUrl: string | undefined, apiUrl?: string): AppPorts {
  return { price: choosePricePort(serverUrl), directory: chooseDirectoryPort(apiUrl) };
}

function choosePricePort(serverUrl: string | undefined): PricePort {
  if (serverUrl) {
    console.info(`[data] composed live from ${serverUrl}`);

    return createWsPricePort(createWsConnection(serverUrl));
  }

  console.info("[data] composed sim: no VITE_SERVER_URL");

  return createPriceSimulator();
}

function chooseDirectoryPort(apiUrl: string | undefined): DirectoryPort {
  if (apiUrl) {
    console.info(`[directory] composed live from ${apiUrl}`);

    return createHttpDirectoryPort(apiUrl);
  }

  console.info("[directory] composed sim: no VITE_API_URL");

  return createDirectorySimulator();
}
