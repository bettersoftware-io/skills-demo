import { describeDirectoryPortContract } from "../ports/__contracts__/DirectoryPortContract.ts";
import { createDirectorySimulator } from "./directorySimulator.ts";

describeDirectoryPortContract("directory simulator", (seed) => ({
  port: createDirectorySimulator(seed),
  teardown: (): void => {},
}));
