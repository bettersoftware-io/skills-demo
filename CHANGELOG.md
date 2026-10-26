# Changelog

What reached the main branch, week by week, written for a person catching up.
It is not a list of commits. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with two changes:

- **A version is an ISO week** (`2026-W40` is Monday 28 September to Sunday
  4 October). A pull request belongs to the week of its merge time in UTC.
- **A week is grouped by theme, then by kind.** It opens with a short summary,
  then `Added`, `Changed` and `Fixed` for what a user or a developer would
  notice, `Decisions` for the choices worth remembering, and `Under the hood`
  for tests, gates, tooling, docs and dependency updates.

Every merged pull request is cited by its number in square brackets, with a
`#` before the number. Each citation has a link definition at the bottom of
this file, in ascending order, and `pnpm changelog defs --write` writes them.
`pnpm changelog check <week>` proves both. The newest week comes first. A
session starts with a note of the finished weeks that are due, and
`pnpm changelog due` lists them.

Each finished week is also a git tag of the same name, on the last commit
that reached the main branch before Monday 00:00 UTC. So
`git diff 2026-W39 2026-W40` is exactly the change the W40 section describes.
The `Weekly tag` workflow creates the tag and opens an issue that asks for
the entry.

## 2026-W43 — 19 Oct – 25 Oct

The demo took three rounds of the plugin, from 0.20.1 to 0.21.2, and with
them the agent-workflow add-on for the first time. It now keeps this
changelog by week, reminds each session of a week that is due, tags every
finished week, and publishes each tagged week as a GitHub Release.

### Added

- **The weekly changelog.** `agent-workflow` came in for the first time: a
  session-start reminder in Claude Code and Codex, `pnpm changelog
  due|defs|tag|check`, a Monday workflow that tags the finished week and
  opens a reminder issue, and `sync-releases.yml`, which publishes a release
  per tagged week once `CHANGELOG_RELEASES` is set. The headless writer
  (`changelog-writer.yml`) came too, and stays off [#18].
- **The first entry and the first release.** 2026-W42 was written, and
  published as the release 2026-W42 [#19].

### Changed

- **Renovate's first wave was met ahead of time.** `.github/renovate.json5`
  became the add-on's: Playwright's package and its image move as one group
  that waits to be asked for, and the schedule is the whole of Monday. Every
  package's `test` script runs `vitest run --no-fsModuleCache`, which the
  kit now requires [#17].
- **The kit and every add-on followed the plugin to 0.21.1 and 0.21.2.**
  The kit gained a gate that checks every workspace package is in the
  lockfile; coverage and visual took new versions of their tools, and
  `visual:check:styles` now also catches a stylesheet re-exported from
  `main.tsx`. No file was refused or forced [#18] [#20].

### Under the hood

- Each update was proven locally with `pnpm gate:full`, the workflow lint
  and the visual tests, with no picture changed [#17] [#18] [#20].

## 2026-W42 — 12 Oct – 18 Oct

The demo took two rounds of the plugin's kit and add-ons and the visual
add-on's redesign. Checks now reach it only through the installer, Renovate
replaced Dependabot, and the screenshot tests became a pyramid of 24
scenarios, pictured the way the app draws them.

### Added

- **Screenshot tests as a pyramid.** 24 scenarios: 14 components, 8 sections
  and 2 pages, each with its own size and the way it is captured. A page is
  the bare viewport, with no frame around it. New to picture: `PriceRowView`
  as its own component, and a category's members in a dialog (a fixed layer,
  a card at a half pixel, a scrolling list). The linux-x64 goldens were drawn
  by five CI runs and compared before they were committed [#15].

### Changed

- **Renovate opens the dependency updates, not Dependabot.** The kit and
  every add-on came from the plugin's 0.17.0; the installer removed
  `.github/dependabot.yml` and wrote `.github/renovate.json5`, with security
  fixes on [#14].
- **Each screenshot carries its own tolerance.** The default moves from no
  difference at all to 8 pixels at threshold 0.01, and a scenario may be
  strict or carry a budget it measured [#15].

### Decisions

- **A check comes through the installer, never by hand.** `AGENTS.md` now
  says so: without that section, Codex asked for an add-on planned to write
  it by hand in 4 runs of 6; with it, in none of 12
  ([skills#34](https://github.com/bettersoftware-io/skills/pull/34)) [#12].
- **Renovate over Dependabot**, because Dependabot's updater runs Node 24 and
  failed here under the demo's Node 26 floor on 14 October
  ([skills#38](https://github.com/bettersoftware-io/skills/pull/38)) [#14].

### Under the hood

- The kit's own files from the plugin's 0.16.0 and 0.17.0: the React policy
  check, the ESLint config, the config loader, and a new `explicit` role in
  the architecture config's table. `pnpm repo:settings` is new [#12] [#14].

[#12]: https://github.com/bettersoftware-io/skills-demo/pull/12
[#14]: https://github.com/bettersoftware-io/skills-demo/pull/14
[#15]: https://github.com/bettersoftware-io/skills-demo/pull/15
[#17]: https://github.com/bettersoftware-io/skills-demo/pull/17
[#18]: https://github.com/bettersoftware-io/skills-demo/pull/18
[#19]: https://github.com/bettersoftware-io/skills-demo/pull/19
[#20]: https://github.com/bettersoftware-io/skills-demo/pull/20
