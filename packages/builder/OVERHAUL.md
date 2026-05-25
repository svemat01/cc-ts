# Builder Overhaul Tracker

This file tracks the ongoing `@cc-ts/builder` overhaul so work can pause and resume safely.

## Goals

- Make the builder feel like a real ComputerCraft build system.
- Improve external-code support, diagnostics, and dependency visibility.
- Fix correctness gaps around runtime loading, watch invalidation, and debug output.
- Make publish/install usage and the programmatic API more coherent.

## Resume Commands

```bash
bun run --filter '@cc-ts/builder' build
bun run --filter '@cc-ts/builder' test
bun run --filter '@cc-ts/builder' typecheck
```

## Milestones

- [x] Add a persistent overhaul tracker.
- [ ] Stabilize builder package surface and exported API.
- [ ] Add dependency analysis and explain/report output.
- [ ] Extend analysis to capture TSTL external call patterns like `require(nil, "...")`.
- [ ] Add explicit external dependency rules and copied-runtime support.
- [ ] Improve compatibility diagnostics for unsupported packages and Node builtins.
- [ ] Fix runtime `require` fallback behavior for external modules.
- [ ] Fix watch invalidation using reverse dependency tracking.
- [ ] Guard or fix incompatible minify/source-map combinations.
- [ ] Improve traceback source mapping fidelity.
- [ ] Respect configured `luaTarget` for lualib generation.
- [ ] Add reproducible-build support for bundle headers.
- [ ] Expand tests for analysis, externals, package surface, and watch invalidation.
- [ ] Update docs/templates/schema/changeset and cut a commit.

## Current Status

- Current branch: `overhaul`
- Working assumption: this is a multi-step feature branch and may need follow-up passes.
- Any unfinished items should be reflected here before stopping.
- Implemented so far:
  - public `src/index.ts` export surface
  - package `exports`/`files`/`build`/`typecheck` scripts
  - analysis/explain config surface and schema/docs updates
  - `externals` rules with `builtin`, `external`, and `copy` modes
  - copied Lua runtime emission into `dist/`
  - fixed bundled `require` fallback for external modules
  - reproducible header mode and `luaTarget`-aware lualib generation
  - warnings no longer throw from `transpileProjectFiles`
- Still to do:
  - reverse-graph watch invalidation
  - stronger analysis for built-ins and other non-plain `require(...)` shapes
  - source-map/traceback tightening and minify guard verification
  - package smoke tests / changeset / commit

## Notes

- The builder currently publishes TypeScript source and requires Bun to run.
- The overhaul should prefer incremental, test-backed improvements over a large rewrite.
