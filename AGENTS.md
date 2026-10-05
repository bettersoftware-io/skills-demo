# Working in this project

A TypeScript monorepo built on ports and adapters, with a streaming UI on RxJS.
The rules below are enforced by checks, not by convention.

## Commands

```bash
pnpm dev          # the React client on the in-browser simulator (no server)
pnpm dev:fs       # the server and the client together
pnpm gate:fast    # architecture gates, lint, typecheck: seconds, for while you work
pnpm gate:full    # gate:fast, then tests and the build: what CI runs
pnpm test
```

Run `pnpm gate:full` before you say work is finished. A red gate means the
work is not finished, and `gate:fast` alone does not show that it is: it runs
no test. The stop hook runs `gate:full` for you whenever a file has changed
since it last passed.

Some sandboxes do not let a process listen on a port; Codex's default one does
not. There the tests that open a real port (the files named `*.port.test.ts`)
are left out, and the run prints a `SKIP` line that says so. That is the
sandbox, not your change: say in your report that those tests were not run
where you are. The stop hook runs `gate:full` outside the sandbox, and CI
never skips them.

## The layers

Dependencies point inward only. `architecture.config.mts` is the declaration
the gates read; a package that is not listed there fails.

| Package | Role | Holds | May import |
|---|---|---|---|
| `packages/domain` | domain | Entities, use cases, port interfaces, simulators | nothing (runtime: `rxjs` only) |
| `packages/shared` | shared | The wire protocol | domain |
| `packages/client-core` | core | Adapters, presenters, state machines, the composition of the app | domain, shared |
| `packages/react-bindings` | bindings | The view model: the only place RxJS meets React | core, domain |
| `packages/client-react` | client | `src/app` (composition root) and `src/ui` (dumb components) | bindings, core, domain |
| `packages/server` | server | The WebSocket server and the REST API | domain, shared |
| `packages/integration` | integration | Tests that run a client adapter against the real server. Tests only | every package above; nothing imports it |

## Where a thing goes

- **It needs the outside world** (network, storage, clock): declare a port in
  `packages/domain/src/ports`, in domain words. Write a contract test beside it
  in `__contracts__`. Implement it as a simulator in the domain and as a real
  adapter in `client-core/src/adapters`, and run the contract against both.
- **It is application behaviour** (what data exists, what happens on an intent,
  anything on a timer): a presenter or a state machine in `client-core`.
- **It turns the wire format into domain terms**: the adapter. Nothing past an
  adapter sees a wire message.
- **It reads configuration or picks an adapter**: the composition root,
  `client-react/src/app`. Nowhere else.
- **It checks that the client and the server agree**: a test in
  `packages/integration`, the only package that may import both. Each side's
  own tests stay where they are; this is for what neither can see alone.
- **It is drawn on screen**: a component in `client-react/src/ui`, reading from
  the view model. No RxJS, storage, `fetch`, environment or timers there.

The price list is a worked example of every one of these. Copy its shape:

| Pattern | File |
|---|---|
| Port | `packages/domain/src/ports/pricePort.ts` |
| Contract test | `packages/domain/src/ports/__contracts__/PricePortContract.ts` |
| Simulator | `packages/domain/src/simulators/priceSimulator.ts` |
| Use case | `packages/domain/src/useCases/trackMovement.ts` |
| Real adapter | `packages/client-core/src/adapters/wsPrice.ts` |
| Presenter (shared state, timers) | `packages/client-core/src/presenters/pricesPresenter.ts` |
| State machine (per-component state) | `packages/client-core/src/machines/selectionMachine.ts` |
| View model | `packages/react-bindings/src/createViewModel.ts` |
| Composition root | `packages/client-react/src/app/startApp.tsx` |
| Client adapter against the real server | `packages/integration/src/directoryOverHttp.test.ts` (in-process), `packages/integration/src/directoryOverHttp.port.test.ts` and `packages/integration/src/priceOverWebSocket.port.test.ts` (over a real port) |
| Dumb component | `packages/client-react/src/ui/PriceList.tsx` |
| Page object and its test | `packages/client-react/src/ui/PriceList.page.tsx`, `PriceList.test.tsx` |

## Tests

- Anything on a timer is tested on fake timers, advanced by the exact interval.
  A test never sleeps.
- A UI test talks to a page object. Only the page object touches the testing
  library.
- A test that opens a real port is named `*.port.test.ts`, so it can be left
  out, and said to be left out, where a port cannot be opened.
- A fixture factory is named `create…`.
- Tests come first in a test file; helpers go below them.

## TypeScript only

No JavaScript source files. Scripts and tool configs are `.mts`, which Node runs
directly. A file a tool can only load as JavaScript is listed in
`architecture.config.mts` under `javascriptAllowed`, with the reason.

## Reviewing a change

A review in this project does two things first, whoever or whatever does it:

1. Runs `pnpm gate:fast` and shows its output. Not run is not passed.
2. Answers the seven questions in `tools/arch/docs/review.md`, each with its
   evidence as `file:line` and a verdict, including the ones that pass.

Anything else a review finds (robustness, security, performance) comes after
those, never in place of them.

## When a gate fails

Its message says what is wrong and where the code belongs. Fix the code. If you
believe a finding is wrong, or it is outside what you were asked to do, say so;
do not work around the gate or edit the rules to make it pass.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

<!-- add-on: coverage -->
## Coverage

`pnpm coverage` holds every file of every package to the bar: 95% of lines,
statements and functions, 85% of branches. It runs in `pnpm gate:full`. A file
is measured with its own package's tests only, so a file that only another
package's tests run reads 0%. The gate decides pass or fail; this section is
what it cannot decide.

### Closing a gap

1. Run `pnpm coverage:gaps`. It measures afresh and ranks the files with the
   most lines no test reaches, across all packages.
2. Start from the top. Read the file and say what is uncovered: a branch, an
   error path, a whole module. Take first the code whose failure nobody would
   notice, such as the choice of adapter in a composition root.
3. Write the test through the public interface: the port, the presenter, the
   page object. Do not export an internal function to reach a line, and do not
   write a test that runs a line and asserts nothing.
4. Prove the test can fail. Put the mutant a wrong implementation would contain
   (`<` for `>`, a dropped guard) in a JSON spec and run
   `pnpm mutation-check mutants.json`; the format is at the top of
   `tools/coverage/mutation-check.mts`. `SURVIVED` means the test cannot see
   that mistake: strengthen the test. Skip this only for a test that already
   failed in front of you before the code existed.
5. Run `pnpm coverage` again.

### When not to chase the number

- **A file no test can reach** (generated code, an entry point that starts the
  app when it is imported): list it under `exclude` in
  `tools/coverage.config.mts`, written from the project root, with the reason.
  Create that file if it is not there; `tools/coverage/lib/config.mts` shows
  its shape and belongs to the add-on, so do not edit it.
- **A line only a real browser or a real network reaches**: mark it
  `/* v8 ignore next -- <why no test can reach it> */`. The gate fails a
  comment without the reason.
- **Test code** (page objects, contract tests, `testing/` harnesses) and files
  with nothing to run (types, re-exports) are already left out. They need no
  test.
- A missing test is never a reason. Do not lower a threshold, exclude a file or
  ignore a line to turn the gate green. If the bar looks wrong for a file, say
  so and leave the gate red.

### Reading the published report

The report on GitHub Pages shows the commit that built it, not the newest one.
Its first line states that commit and the date, and `summary.json` beside it
holds the same. Compare the commit with the code you are reading before you
quote a number from it. For a decision, run `pnpm coverage:gaps`: it is never
stale.
<!-- /add-on: coverage -->

<!-- add-on: visual -->
## Visual goldens

Each scenario in `packages/client-react/tests/visual/scenarios.ts` is rendered
in a fixed state and compared with a committed image (a golden). A difference
fails. Goldens are kept per system in `tests/visual/goldens/<platform>/`,
because systems draw text differently. CI compares the `linux-x64` set.

```bash
pnpm visual          # compare every scenario with this system's goldens
pnpm visual:update   # redraw this system's goldens
pnpm visual:jitter   # measure how much the same commit differs from itself
pnpm visual:check    # in gate:fast: Playwright version pin, typecheck of the tier
```

`pnpm visual` is not part of `gate:full`: it needs a browser and goldens drawn
on this system. Run it yourself after a change that can reach the screen (the
UI, its CSS, a presenter). Skip it for the server, docs and tooling. In CI it
is the `Visual goldens` workflow.

### Add a scenario

Add an entry to `scenarios.ts`: a name and the state, as data. State goes in
through the app harness; never click to reach it, and never wait for time to
pass. If the state cannot be expressed yet, extend `Scenario` and
`host/main.tsx`. Then run `pnpm visual:update`, open the new image, and check
it shows what the name says. Commit the image with the scenario.

### When a comparison fails

1. Read the failure in full. Do not pipe the output through `tail`, `head` or
   `grep`: the cut can hide the failing line and leave a summary that reads as
   a pass.
2. Open `packages/client-react/tests/visual/reports/html/index.html`. Each
   failure shows the golden, the new image and the difference.
3. Decide which it is. **Not meant:** fix the code; leave the goldens alone.
   **Meant:** run `pnpm visual:update`, check that only the scenarios you
   expected changed (`git status`), and commit the images in the same commit as
   the change. Then tell the user the `linux-x64` set also needs a redraw: the
   `Update visual goldens` workflow on the branch, whose summary gives the
   commands. You cannot draw that set on another system.

Never update goldens to make a failure go away before you have looked at the
difference and can say why it is correct. If you cannot say why, stop and ask.

### Traps

- **The goldens did not change after a change you meant.** The page came from a
  stale server, or the change does not reach any scenario. The config refuses
  to use a server it did not start; if the port is taken, find and stop the
  holder (`lsof -iTCP:4319 -sTCP:LISTEN`), do not set `reuseExistingServer`.
- **A scenario fails now and then.** Something on the page still moves. Find it
  and pin it in the host (its clock, an animation, a late font). Do not add a
  wait, a retry or tolerance.
- **Changing `tolerance.ts`.** Only with a measurement: run `pnpm visual:jitter`
  and write what it found beside the numbers. Both knobs matter: a zero pixel
  budget with a loose `threshold` still misses a low-contrast change.
- **Upgrading Playwright.** Change the npm version and the image tag in both
  workflows together (`pnpm visual:check` fails otherwise), then redraw every
  set: a new browser draws new pixels.
- **A missing golden fails; it is never written by a plain run.** On another
  system than the committed sets, `pnpm visual` fails until that system has a
  set of its own. Say so; do not copy another system's images.
<!-- /add-on: visual -->

<!-- add-on: performance -->
## Rendering performance

This UI animates over live data, so main-thread work in one frame is repeated
in every frame. `pnpm perf:check` (part of `gate:fast`) fails what the source
settles. The rest is judgement, and it is yours.

**Before you write or review a CSS animation, a transition or an
`element.animate()` call, read `docs/performance.md`.**

Choosing a fix (each is a section of the guide, with code):

- It changes a size or a position: scale or translate with `transform`, timed
  once at mount ("Progress bars").
- It changes a colour, a shadow or a fill: put the final look on an overlay
  and fade the overlay's `opacity` ("Colour, glow and fill").
- It needs an entry animation and a loop: one per element, the second on a
  wrapper or a pseudo-element ("One animation per property per element").
- It moves part of an SVG, a pattern, or a blurred layer: see the pattern for
  that case. Do not invent a fourth way.

Run `pnpm perf:motion-audit` when:

- you added or changed an animation that live data can trigger;
- `perf:check` printed "Not judged" for your code;
- you changed how often something ticks, flashes or re-renders.

Read its report, not only its exit code: "started N times" on a flash, or a
transition you did not write, is motion that looks idle and is not. It needs
Chromium (`pnpm exec playwright install chromium`) and opens only the paths it
is given, so a view behind a click is yours to check by hand.

When these rules do not apply: an animation that live data cannot trigger. A
hover transition on a button, or a dialog that fades in when the user opens
it, runs rarely and briefly. Do not rewrite it. Accept it in
`tools/perf/allowed.mts` with the reason. Ask first how often its trigger
fires on real data: "on an event" is not a reason if the event is a tick.

Do not add an allow-list entry to get past a finding on steady-state motion,
and do not weaken a check. If a finding looks wrong, say so.
<!-- /add-on: performance -->

<!-- add-on: format-lint -->
## Formatting and lint (Biome)

`pnpm biome:check` (part of `gate:fast`) fails a file that is not formatted, an
import list that is out of order, and a lint finding, warnings included. It
changes nothing. What it cannot decide is below.

**When to run the fixer.** Run `pnpm biome:fix` after you finish editing and
before you run the gate. Do not lay code out by hand, and do not sort imports
by hand. Skip it when you changed no source, JSON or CSS file.

**What the fixer leaves to you.** It applies only the fixes Biome calls safe.
A finding it prints and does not fix is yours to fix in the code: add the
braces, write the type, narrow the value. Do not pass `--unsafe` over the
whole project; an unsafe fix can change what the code does.

**When a rule seems wrong.** Decide which of these it is:

- The code can say the same thing in a way the rule accepts. Do that. For a
  `!` assertion, check the value and throw with a message that says what was
  missing.
- The rule does not fit one kind of file (a framework needs a default export
  there, say). Add an `overrides` entry for those files to `biome.json` at
  the root, and write the reason in the commit message.
- The rule does not fit this project at all. Say so and ask before you turn it
  off in `biome.json`.
- One line is a true exception. Only then write
  `// biome-ignore lint/<group>/<rule>: <reason>` on the line above. The
  reason says why this line is different, not what the rule is. Never write
  one without a reason, and never to get a gate to pass.

Do not edit `tools/format-lint/biome.base.json`: an update of the add-on
replaces it. The project's own rules go in `biome.json`, which extends it.

Biome does not read `tools/`. It does not replace `pnpm lint` (ESLint, the
architecture rules); both run.
<!-- /add-on: format-lint -->

<!-- add-on: ci-security -->
## CI security

Three workflows check the supply chain on GitHub: `CI security` (workflow lint
and `pnpm audit --prod`), `Dependency Review` and `Scorecard`. They need the
network, so none of them is in `pnpm gate:full`. This section is what they
cannot decide.

```bash
pnpm lint:workflows              # actionlint (valid?) then zizmor (safe?)
pnpm lint:workflows zizmor       # one of them
```

Exit 0 is a pass. Exit 1 is a finding, named in the linter's output above the
`FAIL` line. Exit 2 with a `SKIP` line means the lint did not run here (no
network on the first run, no build for this machine, a wrong checksum). Report
a `SKIP` as "not run". Never report it as a pass, and do not retry in a loop: a
sandbox with no network will not get one.

### When you add or change a workflow

Run `pnpm lint:workflows` before you commit. Skip it only when no file under
`.github/` changed. In a new workflow:

- Pin every action by its full commit hash, with the version in a comment
  after it. Take the hash from the action's release, not from memory.
- Give the workflow `permissions: contents: read`. Grant a write on the one job
  that needs it, with a comment that says why.
- Write `persist-credentials: false` on every checkout, unless that job pushes.
- Put no `${{ … }}` expression in a `run:` line. Pass the value through `env:`
  and quote the variable.
- Do not use `pull_request_target` or `workflow_run`. If the task seems to need
  one, stop and ask the user.

Do not silence a finding with `# zizmor: ignore[…]`, a `zizmor.yml` or an
`actionlint.yaml` to turn the run green. Fix the workflow. If you believe a
finding is wrong, say so and leave it red.

### When Dependency Review fails a pull request

Its job summary names the package and the advisory or licence.

- **An advisory:** move to the patched version it names. If the package came
  in through another one, update that one, or add a pnpm `overrides` entry
  that lifts only the vulnerable package, with a comment that names the
  advisory.
- **No patched version exists:** do not add the dependency. If it is already
  on main, tell the user; they decide whether to accept it.
- **A refused licence** (GPL, AGPL, SSPL): do not add the package. Find
  another. A package offered under two licences, one of them permissive, is
  the user's decision, not yours.

Never loosen `fail-on-severity`, `fail-on-scopes` or `deny-licenses` to pass.

### When `pnpm audit --prod` fails

The same steps as an advisory above. The weekly run can fail with no change in
the project: an advisory was published for a version already in the lockfile.

### Moving a linter to a newer release

`tools/ci-security/lib/pins.mts` holds the version, four URLs and four
checksums of each linter, and its first lines give the command that prints the
checksums. Change all of them together. If a download is refused for a wrong
checksum, never copy the new checksum into the file to make it pass: tell the
user.
<!-- /add-on: ci-security -->

<!-- add-on: repo-hygiene -->
## Repo hygiene

Three checks run in `gate:fast`: `pnpm check:versions`, `pnpm check:doc-links`
and `pnpm lint:css`. Each fails with the file and what to change. What they
cannot decide is below.

**Versions.** When you add a dependency a second package already has, copy
that package's range. When the check fails, change the ranges to agree; do not
add a version group to get past it. A version group in
`tools/repo-hygiene/syncpack.json` is for a difference the project wants (two
majors during a migration), and its `label` says why and until when. Skip
this when the project has one package.

**Links.** When you rename a heading, move a file or delete a document, run
`pnpm check:doc-links` before you commit, and repair each link it names:
point it at the new place. Remove a link only when what it pointed to is gone
for good. Do not work out an anchor in your head. GitHub drops punctuation and
keeps the spaces around it, so `## A -- B` is `#a----b`; the check prints the
anchor the file really has. It does not follow `https:` links, and it does not
read `tools/`. Those are yours to check by reading. Skip this for a change
that touches no markdown.

**CSS.** Fix what stylelint reports. Turn a rule off in
`tools/repo-hygiene/stylelint.json` only when the project as a whole does not
want it, never for one file that breaks it, and say why in the commit message.
Do not add a `stylelint-disable` comment without a reason after it. Skip this
for a change that touches no `.css` file.

Do not weaken a check to make it pass. If a finding looks wrong, say so.
<!-- /add-on: repo-hygiene -->
