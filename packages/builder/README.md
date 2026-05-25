# @cc-ts/builder

A powerful bundler and build tool for ComputerCraft TypeScript projects. The builder helps you compile, bundle, and serve TypeScript code for ComputerCraft computers.

> **Note:** The builder requires [Bun](https://bun.sh/) to run.

## Features

-   🎯 TypeScript to Lua compilation optimized for ComputerCraft
-   📦 Smart bundling with dependency resolution
-   🔍 Source map support for better debugging
-   🔎 Dependency analysis and explain reports
-   🚀 Development server for quick testing
-   ⚡ Watch mode for rapid development
-   📑 Minimal Lua library generation per entrypoint
-   🗜️ Optional minification

## Getting Started

The easiest way to get started with CC-TS is to use our project creation tool:

```bash
bun create cc-ts my-project
# or
npm create cc-ts@latest my-project
```

This will guide you through creating a new project with two options:

-   **Bundled App**: A complete application that uses `@cc-ts/builder` for bundling and development
-   **CC Library**: A library project that can be published and used by other CC-TS projects

The creation tool will set up your project with the correct dependencies and configuration files.

For more information about creating new projects, check out the [`create-cc-ts`](https://github.com/svemat01/cc-ts/tree/master/packages/create-cc-ts) package.

## Installation

```bash
bun add -D @cc-ts/builder
# or
npm install --save-dev @cc-ts/builder
```

## Usage

### CLI

The builder can be used via its CLI command `cc-ts`:

```bash
cc-ts [options] [files...]
```

### Configuration

Configure your project by adding a `cc-ts` section to your `tsconfig.json`:

```json
{
    "compilerOptions": {
        // ... your TypeScript options
    },
    "tstl": {
        "luaTarget": "CC-5.2",
        "luaLibImport": "require-minimal",
        "buildMode": "default"
    },
    "cc-ts": {
        "minify": false,
        "analyze": false,
        "builtInModules": [],
        "externals": [],
        "reproducible": false,
        "serve": false,
        "servePort": 8080
    }
}
```

### CLI Options

-   `-p, --project <path>` - Path to tsconfig.json
-   `--minify` - Minify the output Lua code
-   `--analyze` - Print a dependency analysis report after the build
-   `--analyzeFormat <text|json>` - Choose analysis output format
-   `--analyzeOutput <path>` - Write analysis output to a file
-   `--serve` - Start a development server
-   `--servePort <number>` - Specify development server port (default: 8080)
-   `--watch` - Watch mode for development
-   `--debug` - Enable debug logging
-   `--explain <a,b,c>` - Explain specific modules in the analysis output
-   `--externals <json>` - Configure external module rules
-   `--reproducible` - Remove volatile build metadata from bundle headers
-   `-h, --help` - Show help information
-   `-v, --version` - Show version information

### Development Server

The builder includes a development server for testing your code. Enable it with:

```bash
cc-ts --serve
```

This will start a server (default port 8080) that serves your compiled Lua files.

### Watch Mode

For development, you can use watch mode to automatically recompile on changes:

```bash
cc-ts --watch
```

Combine with serve for a complete development setup:

```bash
cc-ts --watch --serve
```

### Package Scripts

Add these convenient scripts to your `package.json`:

```json
{
    "scripts": {
        "build": "cc-ts",
        "dev": "cc-ts --watch --serve",
        "watch": "cc-ts --watch"
    }
}
```

## Advanced Features

### Built-in Modules

Specify built-in modules that should not be resolved and bundled:

```json
{
    "cc-ts": {
        "builtInModules": ["fs", "http"]
    }
}
```

This is useful when a module is provided by ComputerCraft or by your own runtime environment.

### Ignoring Files as Entry Points

Specify which files should be ignored as entry points using glob patterns:

```json
{
    "cc-ts": {
        "ignoreAsEntryPoint": ["**/*.lib.ts", "src/utils/**"]
    }
}
```

Files matching these patterns will still be included when imported by other modules, but won't be built as standalone entry points. This is useful for utility libraries, shared code, and similar files.

### Dependency Analysis

Ask the builder to explain what happened to each dependency:

```bash
cc-ts --analyze
cc-ts --analyze --analyzeFormat json --analyzeOutput dist/build-analysis.json
cc-ts --analyze --explain fs,my-library.runtime
```

This is useful when you want to answer questions like:

- why was a module bundled?
- why was it left external?
- which runtime files were copied into `dist/`?

### External Runtime Rules

`externals` rules let you explicitly classify runtime dependencies:

```json
{
    "cc-ts": {
        "externals": [
            {
                "pattern": "fs",
                "mode": "builtin",
                "reason": "Provided by the ComputerCraft runtime"
            },
            {
                "pattern": "my-vendor-lib",
                "mode": "external",
                "reason": "Installed separately on the target computer"
            },
            {
                "pattern": "my-lua-lib",
                "mode": "copy",
                "outDir": "vendor",
                "reason": "Ship the runtime Lua alongside the bundle"
            }
        ]
    }
}
```

Rule modes:

- `builtin`: treat the module like a provided runtime dependency.
- `external`: leave the module unresolved at bundle time and expect it at runtime.
- `copy`: emit the runtime Lua file into the build output and extend `package.path` to find it.

### External Code Guidance

The builder works best with these dependency shapes:

- local TypeScript or JSON files in your project
- TSTL-compatible packages that publish compilable source
- Lua runtime packages that also ship `.d.ts` declarations
- vendored runtime Lua that you mark as `external` or `copy`

Packages that only publish JavaScript are usually not directly usable from ComputerCraft builds. When possible, prefer:

- a `.lua` + `.d.ts` package
- vendored TypeScript source
- a TSTL-compatible package
- a custom adapter layer instead of importing a Node-oriented package directly

### Minification

Enable minification for production builds:

```json
{
    "cc-ts": {
        "minify": true
    }
}
```

`minify` currently cannot be combined with `sourceMap` or `sourceMapTraceback` in the builder. If you need runtime traceback fidelity, keep minification disabled.

### Reproducible Bundles

Enable `reproducible` to remove timestamp noise from generated headers:

```json
{
    "cc-ts": {
        "reproducible": true
    }
}
```

Created and maintained by Jakob Helgesson.
