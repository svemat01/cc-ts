import { describe, expect, test } from "bun:test";
import * as ts from "typescript";

import { validateOptions } from "../src/CompilerOptions";
import { parseConfigFileWithSystem } from "../src/cli/tsconfig";
import {
    createTestTsConfig,
    toJson,
    withTempProject,
} from "./utils/projects";

describe("parseConfigFileWithSystem", () => {
    test("inherits cc-ts options from extended configs", async () => {
        await withTempProject(
            {
                "src/main.ts": "export const value = 1;\n",
                "base.json": toJson(
                    createTestTsConfig({
                        ccTs: {
                            minify: true,
                            builtInModules: ["fs"],
                            ignoreAsEntryPoint: ["src/generated/**"],
                        },
                    })
                ),
                "mid.json": toJson({
                    extends: "./base.json",
                    "cc-ts": {
                        debug: true,
                        minify: false,
                    },
                }),
                "tsconfig.json": toJson({
                    extends: "./mid.json",
                    "cc-ts": {
                        extraPaths: ["vendor"],
                        servePort: 8123,
                    },
                }),
            },
            async (projectDir) => {
                const parsed = parseConfigFileWithSystem(
                    `${projectDir}/tsconfig.json`
                );

                expect(parsed.errors).toHaveLength(0);
                expect(parsed.options.minify).toBe(false);
                expect(parsed.options.debug).toBe(true);
                expect(parsed.options.builtInModules).toEqual(["fs"]);
                expect(parsed.options.ignoreAsEntryPoint).toEqual([
                    "src/generated/**",
                ]);
                expect(parsed.options.extraPaths).toEqual(["vendor"]);
                expect(parsed.options.servePort).toBe(8123);
            }
        );
    });

    test("prefers direct tsconfig values over extended cc-ts values", async () => {
        await withTempProject(
            {
                "src/main.ts": "export const value = 1;\n",
                "base.json": toJson(
                    createTestTsConfig({
                        ccTs: {
                            minify: true,
                            extraPaths: ["base-path"],
                        },
                    })
                ),
                "tsconfig.json": toJson({
                    extends: "./base.json",
                    compilerOptions: createTestTsConfig().compilerOptions,
                    "cc-ts": {
                        minify: false,
                    },
                    include: ["src/**/*.ts"],
                }),
            },
            async (projectDir) => {
                const parsed = parseConfigFileWithSystem(
                    `${projectDir}/tsconfig.json`
                );

                expect(parsed.errors).toHaveLength(0);
                expect(parsed.options.minify).toBe(false);
                expect(parsed.options.extraPaths).toEqual(["base-path"]);
            }
        );
    });

    test("migrates root-level cc-ts options and emits a warning", async () => {
        await withTempProject(
            {
                "src/main.ts": "export const value = 1;\n",
                "tsconfig.json": toJson({
                    compilerOptions: createTestTsConfig().compilerOptions,
                    minify: true,
                    servePort: 8123,
                    include: ["src/**/*.ts"],
                }),
            },
            async (projectDir) => {
                const parsed = parseConfigFileWithSystem(
                    `${projectDir}/tsconfig.json`
                );

                expect(parsed.options.minify).toBe(true);
                expect(parsed.options.servePort).toBe(8123);
                expect(parsed.errors).toHaveLength(1);
                expect(parsed.errors[0].category).toBe(
                    ts.DiagnosticCategory.Warning
                );
                expect(String(parsed.errors[0].messageText)).toContain(
                    'TSTL options are moving to the "tstl" object'
                );
            }
        );
    });
});

describe("validateOptions", () => {
    test("reports invalid builder-specific option combinations", () => {
        const diagnostics = validateOptions({
            luaBundle: "bundle.lua",
            serve: true,
            ignoreAsEntryPoint: ["src/generated/**", 1],
        } as any);

        expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
            90001,
            90002,
            90005,
        ]);
    });

    test("returns no diagnostics for valid builder-specific options", () => {
        const diagnostics = validateOptions({
            watch: true,
            serve: true,
            ignoreAsEntryPoint: ["src/generated/**"],
        } as any);

        expect(diagnostics).toHaveLength(0);
    });
});
