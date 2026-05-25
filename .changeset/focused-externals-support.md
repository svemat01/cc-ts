---
"@cc-ts/builder": minor
---

Add `externals` option for configuring external module handling. Supports `builtin`, `external`, and `copy` modes with optional `outDir` and `reason` fields. External rules allow marking Node builtins, runtime-provided modules, or copying Lua runtime files into the output directory.
