# @cc-ts/helpers

## 0.4.2

### Patch Changes

- e0a0827: Fix publishing issue

## 0.4.1

### Patch Changes

- 0a05a1b: Added integration for CC: Redstone Link Bridge (`redstone_link_bridge` peripheral) with `getLinkSignal` and `sendLinkSignal` methods.

## 0.4.0

### Minor Changes

- e249e00: Add integration types for Create mod peripherals, Advanced Math (matrix/quaternion/PID), Aeronautics sensors, CC: Sable physics, and CC Sable sublevels. Import the new modules to augment peripheral and event types.
- e249e00: Restructure module layout: scheduler and types moved to `core/`, utilities moved to `utils/`. Update imports accordingly (e.g. `@cc-ts/helpers/core/scheduler`, `@cc-ts/helpers/utils/sandcorn`).

### Patch Changes

- Updated dependencies [04c3347]
- Updated dependencies [e249e00]
  - @cc-ts/craftos-types@0.1.0

## 0.3.0

### Minor Changes

- 7c34e54: Introduce otel helpers

## 0.2.2

### Patch Changes

- acf59f3: Fix build

## 0.2.1

### Patch Changes

- d1f67f9: Fix build

## 0.2.0

### Minor Changes

- a69aa33: Refactor events api
- 615b99e: Migrate to @cc-ts/typescript-to-lua

### Patch Changes

- 4ea0716: Introduce scheduler
- cab9911: Introduce AbortController, EventEmitter and Proxy
- bd100a7: Fix response arg type of websocket_success event
- 69af368: Introduce waitForAnyEvent, setTimeout and escalate utils
- 9535a18: Bump typescript & typescript to lua version

## 0.1.0

### Minor Changes

- 63fa464: Updated typescript to 5.2.2
  Updated jackmacwindows packages (tstl, cc-types, craftos-types, lua-types)
  Changed lua target to CC-5.2
  Revamped builder logging
  Rewrote bundler/builder with deeper integration to TSTL and individual lualib generation per entrypoint

## 0.0.1

### Patch Changes

- fae197f: Initial release
- Updated dependencies [3786721]
  - @cc-ts/craftos-types@0.0.1
