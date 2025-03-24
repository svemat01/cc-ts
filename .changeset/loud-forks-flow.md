---
"@cc-ts/builder": minor
---

### New Features

-   Added a new `ignoreAsEntryPoint` option in `tsconfig.json` to specify files that should not be treated as build entry points
-   Added `extraPaths` configuration option to extend module resolution paths

### Improvements

-   Updated the documentation in README to include a section on ignoring files as entry points
-   Added a note about Bun being a required dependency for running the builder
-   Enhanced bundler and transpiler logic to respect the new ignore patterns
-   Made the module resolution system more flexible by supporting additional paths

### Bug Fixes

-   Improved diagnostic messages for entry module and dependency not found scenarios

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
