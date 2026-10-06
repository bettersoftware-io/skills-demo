// The config `pnpm lint:types` runs. This file is the project's: add a block
// after `typedLint()` to add a rule, change one or switch one off.
//
// The project's own config comes first, so this run reports everything
// `pnpm lint` does and a disable comment for one of those rules is still
// counted as used.

import base from "../../eslint.config.mts";
import { typedLint } from "./eslint.typed.base.mts";

// `.remember/` is the working folder of a Claude Code plugin on a developer's
// machine. It ignores itself in git and holds no source, but one of its
// timestamp files ends in `.ts` (`tmp/last-ndc.ts`), which the typed run reads
// as a TypeScript file that no tsconfig includes. Nothing of the project is
// in that folder, and it does not exist in CI.
const MACHINE_LOCAL: string[] = [".remember/**"];

export default [{ ignores: MACHINE_LOCAL }, ...base, ...typedLint()];
