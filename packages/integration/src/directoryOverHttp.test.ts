import { createHttpDirectoryPort } from "@skills-demo/client-core";
import { createDirectorySimulator } from "@skills-demo/domain";
import { describeDirectoryPortContract } from "@skills-demo/domain/ports/__contracts__/DirectoryPortContract.ts";
import { createDirectoryApi } from "@skills-demo/server/directoryApi.ts";

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
