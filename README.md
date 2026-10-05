# skills-demo

A demo of [bettersoftware-skills](https://github.com/bettersoftware-io/skills):
a project created by its script, with its three add-ons, and one feature built
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
which Vite bundles; the server and the tooling are run by Node directly. This
needs Node 24 or later.

The checks live in `tools/arch` and are described in its README.
