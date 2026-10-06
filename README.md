# skills-demo

A demo of [bettersoftware-skills](https://github.com/bettersoftware-io/skills):
a project created by its script, with its add-ons, and one feature built
on top by an AI agent that was given only this repository's `AGENTS.md` and
hooks. The commit history is the record: the project as created, each add-on,
then [the feature](https://github.com/bettersoftware-io/skills-demo/pull/1).
The published coverage report is at
<https://bettersoftware-io.github.io/skills-demo/coverage/>.

It is ports and adapters in a pnpm monorepo, a streaming UI on RxJS and React,
and the checks that keep it that way.

```bash
pnpm install
pnpm dev          # http://localhost:5173, on the in-browser simulator
pnpm dev:fs       # the server and the client together
pnpm gate:full    # everything CI runs
pnpm gate:full:quiet   # the same verdict, printing only the stage that failed
```

It contains one small feature, a live price list, built the way every feature
is meant to be built. [AGENTS.md](AGENTS.md) says where each kind of code goes
and lists the file that shows each pattern.

Beside it is a small user-management screen: categories and the users in
them, with add, edit and delete. With `pnpm dev` the data is kept in the
browser; with `pnpm dev:fs` it is kept in the server's memory, behind a REST
API built with Hono (`packages/shared/src/directoryProtocol.ts` lists the
routes). The client finds the API through `VITE_API_URL`, and the price feed
through `VITE_SERVER_URL`; either one left unset runs on its simulator.

Packages export their TypeScript source. Nothing is compiled except the client,
which Vite bundles; the server and the tooling are run by Node directly.

The client's build runs the React Compiler, so its source has no `useMemo`,
`useCallback` or `memo`; `pnpm check:compiler` holds the compiler to what
relies on it.

This needs Node 26 or later. The floor is `devEngines.runtime` in
`package.json`, which pnpm enforces on install. It is not `engines.node`: a
host's build reads that field and refuses a range above the Node it offers.
`.nvmrc` holds the same number for a version manager.

pnpm is pinned in `package.json` too, as `packageManager`: an exact version
and the sha512 hash of that release, which Corepack checks the download
against. To move to another pnpm, run
`node tools/arch/ci/pin-package-manager.mts pnpm@<version> --write` and then
`pnpm install`.

Beyond `gate:full`, two checks need a browser and run on their own:

```bash
pnpm e2e:install  # once on a machine: downloads the browser
pnpm e2e          # end-to-end: the built client in a browser, on the simulator and against the real server
pnpm visual       # screenshots of the UI against the committed goldens
```

The checks live in `tools/arch` and are described in its README.
