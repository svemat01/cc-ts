# @cc-ts/builder

## 0.4.0

### Minor Changes

- e249e00: Add dependency analysis with `--analyze`, `--analyze-format`, `--analyze-output`, and `--explain` flags. Analysis reports entrypoints, bundled vs external dependencies, and copied files. Supports text and JSON output for CI or tooling integration.
- e249e00: Add `externals` option for configuring external module handling. Supports `builtin`, `external`, and `copy` modes with optional `outDir` and `reason` fields. External rules allow marking Node builtins, runtime-provided modules, or copying Lua runtime files into the output directory.
- 510f60a: Expand `@cc-ts/builder` into a more capable build system with dependency analysis, external runtime rules, copied Lua runtime support, reproducible bundle headers, improved publish surface, and better watch-mode invalidation.
- e249e00: Add `reproducible` option to strip volatile metadata (timestamps, build hashes) from bundle headers for deterministic output.

### Patch Changes

- e249e00: Emit warnings instead of throwing for non-fatal issues such as unresolved JavaScript packages and Node builtins. New diagnostics cover invalid `explain`/`externals`/`analyzeFormat` values and minify+sourceMap incompatibility.

## 0.3.0

### Minor Changes

- 00c8679: ### New Features

  - Added a new `ignoreAsEntryPoint` option in `tsconfig.json` to specify files that should not be treated as build entry points
  - Added `extraPaths` configuration option to extend module resolution paths

  ### Improvements

  - Updated the documentation in README to include a section on ignoring files as entry points
  - Added a note about Bun being a required dependency for running the builder
  - Enhanced bundler and transpiler logic to respect the new ignore patterns
  - Made the module resolution system more flexible by supporting additional paths

  ### Bug Fixes

  - Improved diagnostic messages for entry module and dependency not found scenarios

  The new `ignoreAsEntryPoint` option replaces the previous hardcoded `.lib.ts` file filtering with a flexible, user-configurable system that uses glob patterns. Files matching these patterns will still be included when imported by other modules, but won't be built as standalone entry points.

  Example configuration in tsconfig.json:

  ```json
  {
    "cc-ts": {
      "ignoreAsEntryPoint": ["**/*.lib.ts", "src/utils/**"],
      "extraPaths": ["./vendor"]
    }
  }
  ```

## 0.2.0

### Minor Changes

- 615b99e: Migrate to @cc-ts/typescript-to-lua
- 04cdb59: Refactor cli and api

### Patch Changes

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

- 1d871e6: Initial release
