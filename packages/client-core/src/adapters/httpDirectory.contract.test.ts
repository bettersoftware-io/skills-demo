import { createDirectorySimulator } from "@skills-demo/domain";
import { describeDirectoryPortContract } from "@skills-demo/domain/ports/__contracts__/DirectoryPortContract.ts";

import { createFakeDirectoryServer } from "../testing/fakeDirectoryServer.ts";
import { createHttpDirectoryPort } from "./httpDirectory.ts";

const SERVER_URL = "http://example.test";

describeDirectoryPortContract("HTTP directory adapter", (seed) => {
  return {
    port: createHttpDirectoryPort(
      SERVER_URL,
      createFakeDirectoryServer(createDirectorySimulator(seed), SERVER_URL)
        .send,
    ),
    teardown: (): void => {},
  };
});
