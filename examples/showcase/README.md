## CC-TS Showcase

Small example project for browsing and manually testing the non-CRPC parts of this repo.

It demonstrates:

- `@cc-ts/builder` multi-entry builds
- `ignoreAsEntryPoint`
- copied Lua runtime files via `externals`
- JSON module imports
- analysis output and reproducible bundle headers
- `@cc-ts/helpers` CLI parsing
- persisted state
- Sandcorn IDs
- typed event emitters
- proxy-based instrumentation
- OTEL logs and metrics helpers
- Rednet helper usage
- scheduler + `AbortController`

### Entrypoints

- `src/main.ts`: command-driven overview for the rest of the example
- `src/telemetry.ts`: emits and prints OTEL-shaped logs/metrics payloads
- `src/network.ts`: demonstrates `waitForLookup` + `waitForResponse`
- `src/timers.ts`: demonstrates `on`, `waitForEvent`, `asyncSleep`, and `AbortController`

### Shared Files

- `src/shared/state.ts`: persisted state wrapper used across the example
- `src/shared/session.ts`: sample workflow that uses several helper modules together
- `src/showcase_runtime.lib.lua`: Lua runtime shipped separately with builder `externals`

### Builder Notes

`tsconfig.json` is intentionally set up to show several builder features in one place:

- multiple entrypoints
- copied runtime Lua in `dist/vendor/`
- ignored shared files as entrypoints
- emitted analysis report in `dist/build-analysis.json`
- reproducible headers

### Manual Test Ideas

1. Build the example and inspect the emitted `dist/*.lua` files.
2. Run `main.lua` and try `session run`, `session show`, `session reset`, and `telemetry`.
3. Run `telemetry.lua` to inspect the flushed OTEL data structures.
4. Run `timers.lua` and press `q` or `Enter` to exercise the scheduler helpers.
5. Run `network.lua` on a computer with a modem after setting up a matching Rednet peer.

### Expected Outputs

With the current file layout, the builder should emit bundles similar to:

- `dist/main.lua`
- `dist/telemetry.lua`
- `dist/network.lua`
- `dist/timers.lua`
- `dist/vendor/showcase_runtime/lib.lua`
- `dist/build-analysis.json`
