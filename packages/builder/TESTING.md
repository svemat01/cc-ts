# Builder Testing Guide

This package wraps `@cc-ts/typescript-to-lua`, so regressions are often not about a single function returning the wrong value. They are usually about turning a valid project into the wrong Lua output, the wrong diagnostics, or the wrong CLI behavior.

The test suite should reflect that.

## Goals

- Catch output regressions during refactors and migrations.
- Verify builder-specific behavior that TSTL does not own.
- Verify the seams where we adapt, extend, or constrain TSTL.
- Keep failures easy to understand and update intentionally.

## Test Layers

### 1. Focused parser/config tests

Use these when the behavior is local and deterministic.

Test:
- CLI option parsing
- alias handling
- camelCase and kebab-case flag handling
- config inheritance and override precedence
- option validation diagnostics

Why:
- These are cheap to run.
- They fail close to the source of the regression.
- They protect migration-sensitive glue code.

Current files:
- `test/cli-parse.test.ts`
- `test/config.test.ts`

### 2. Direct bundler tests

Use these when testing builder-specific bundling behavior without requiring a full project transpilation.

Test:
- builder diagnostics for missing entry modules
- builder diagnostics for missing dependencies

Why:
- These behaviors belong to the builder, not TypeScript or TSTL.
- They are easier to assert directly than through a larger fixture.

Current file:
- `test/bundler.test.ts`

### 3. End-to-end transpilation tests

This should be the core of the suite.

Test real project inputs and verify real emitted artifacts.

Test:
- which entrypoints are emitted
- how dependencies are bundled
- source map output
- minification output
- built-in module behavior
- `extraPaths` behavior
- error propagation through `TranspilationError`

Why:
- Most migration risk lives in the full pipeline.
- This is the closest test layer to how users actually use the package.

Current file:
- `test/transpiler.test.ts`

### 4. CLI end-to-end tests

Run the actual `cc-ts` entrypoint for important flows.

Test:
- successful project builds from tsconfig
- help output
- builder-specific CLI failures

Why:
- The CLI is a public interface.
- It exercises argument parsing, config loading, diagnostics, and process exit behavior together.

Current file:
- `test/e2e.test.ts`

## When To Use Snapshots

Snapshots are best when the exact emitted Lua shape matters and hand-writing many string assertions would be noisy.

Good snapshot candidates:
- complete emitted bundle output for a representative project
- the full set of emitted files in `dist/`
- CLI help output

Avoid snapshots when:
- the behavior is better expressed as a small explicit assertion
- the output contains too much unstable noise
- only one or two lines matter

If output includes unstable values like version, hash, or timestamp, normalize them first.

That is why the suite uses helpers like:
- `normalizeBundleOutput()`
- `readNormalizedDistArtifacts()`
- `normalizeHelpOutput()`

## What We Should Keep Testing

When adding or changing builder behavior, ask whether the change affects any of these categories:

- CLI input shape
- tsconfig inheritance or migration behavior
- entrypoint selection
- bundled module graph shape
- emitted Lua text
- emitted source maps
- emitted diagnostics
- process exit code or stdout/stderr behavior

If yes, add or update at least one test at the highest meaningful layer.

Prefer e2e coverage when the change crosses more than one stage.

## Shared Test Utilities

Reusable helpers live under `test/utils/`.

- `projects.ts`
  Creates temp projects, writes fixtures, parses configs, and runs transpilation.
- `artifacts.ts`
  Reads and normalizes emitted outputs for artifact assertions and snapshots.
- `cli.ts`
  Runs the real CLI and normalizes CLI output.
- `fixtures.ts`
  Holds reusable project fixtures for richer e2e coverage.

Keep helpers generic. Put scenario-specific setup in the test file or fixture helper.

## Adding New Coverage

Prefer adding at least one representative e2e test for:

- new builder options
- changes to emitted bundle format
- changes to path resolution
- changes to how diagnostics are surfaced
- changes to TSTL integration points

Examples of strong future e2e cases:

- multiple entrypoints sharing dependencies
- JSON imports plus source maps
- lualib-heavy projects
- custom built-in modules
- minified and non-minified snapshot pairs
- watch/serve behavior if we later make it more testable

## Running Tests

Package tests:

```bash
bun test --preload ./test/setup.ts
```

Update snapshots:

```bash
bun test --preload ./test/setup.ts --update-snapshots
```

Workspace tests:

```bash
bun run test
```

## Maintenance Rules

- Prefer small fixtures over mocking TSTL internals.
- Prefer explicit assertions for diagnostics and key invariants.
- Use snapshots for rich, stable outputs after normalization.
- If a test fails because output changed intentionally, review whether the new output is actually correct before updating snapshots.
- If a builder change affects emitted Lua, add or update an e2e test, not only a unit test.
