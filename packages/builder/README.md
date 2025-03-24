# @cc-ts/builder

A powerful bundler and build tool for ComputerCraft TypeScript projects. The builder helps you compile, bundle, and serve TypeScript code for ComputerCraft computers.

> **Note:** The builder requires [Bun](https://bun.sh/) to run.

## Features

-   🎯 TypeScript to Lua compilation optimized for ComputerCraft
-   📦 Smart bundling with dependency resolution
-   🔍 Source map support for better debugging
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
        "builtInModules": [],
        "serve": false,
        "servePort": 8080
    }
}
```

### CLI Options

-   `-p, --project <path>` - Path to tsconfig.json
-   `--minify` - Minify the output Lua code
-   `--serve` - Start a development server
-   `--servePort <number>` - Specify development server port (default: 8080)
-   `--watch` - Watch mode for development
-   `--debug` - Enable debug logging
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

### Minification

Enable minification for production builds:

```json
{
    "cc-ts": {
        "minify": true
    }
}
```

Created and maintained by Jakob Helgesson.
