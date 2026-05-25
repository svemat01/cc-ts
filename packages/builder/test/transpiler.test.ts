import { describe, expect, test } from "bun:test";

import { parseConfigFileWithSystem } from "../src/cli/tsconfig";
import { TranspilationError, transpileProjectFiles } from "../src/transpiler";
import {
    createTestTsConfig,
    fileExists,
    readJsonFile,
    toJson,
    withParsedProject,
    withTempProject,
    withTranspiledProject,
} from "./utils/projects";

describe("transpileProjectFiles", () => {
    test("bundles imported .lib files without emitting standalone outputs", async () => {
        await withTempProject(
            {
                "tsconfig.json": toJson(createTestTsConfig()),
                "src/shared.lib.ts": 'export const shared = "shared";\n',
                "src/main.ts":
                    'import { shared } from "./shared.lib";\nexport default shared;\n',
                "src/other.ts": 'export default "other";\n',
            },
            async (projectDir) => {
                const parsed = parseConfigFileWithSystem(
                    `${projectDir}/tsconfig.json`
                );
                const result = await transpileProjectFiles(parsed);

                expect(result.emitSkipped).toBe(false);

                const mainBundle = await Bun.file(`${projectDir}/dist/main.lua`).text();
                const otherBundle = await Bun.file(`${projectDir}/dist/other.lua`).text();

                expect(await fileExists(`${projectDir}/dist/shared.lib.lua`)).toBe(
                    false
                );
                expect(mainBundle).toContain('["main"] = function(...)');
                expect(mainBundle).toContain("shared.lib");
                expect(mainBundle).toContain("main.ts");
                expect(mainBundle).toContain("shared.lib.ts");
                expect(otherBundle).toContain("-- Entry: other");
            }
        );
    });

    test("writes source maps that reference every bundled source file", async () => {
        await withTranspiledProject(
            {
                "tsconfig.json": toJson(
                    createTestTsConfig({
                        compilerOptions: {
                            sourceMap: true,
                        },
                    })
                ),
                "src/shared.lib.ts": 'export const shared = "shared";\n',
                "src/main.ts":
                    'import { shared } from "./shared.lib";\nexport default shared;\n',
            },
            async ({ projectDir }) => {
                const sourceMap = await readJsonFile<{
                    version: number;
                    sources: string[];
                    mappings: string;
                }>(`${projectDir}/dist/main.lua.map`);

                expect(sourceMap.version).toBe(3);
                expect(sourceMap.sources).toEqual([
                    "../src/main.ts",
                    "../src/shared.lib.ts",
                ]);
                expect(sourceMap.mappings.length).toBeGreaterThan(0);
            }
        );
    });

    test("supports project-relative ignoreAsEntryPoint glob patterns", async () => {
        await withTranspiledProject(
            {
                "tsconfig.json": toJson(
                    createTestTsConfig({
                        ccTs: {
                            ignoreAsEntryPoint: ["src/utils/**"],
                        },
                    })
                ),
                "src/utils/helper.ts": 'export const helper = "helper";\n',
                "src/main.ts":
                    'import { helper } from "./utils/helper";\nexport default helper;\n',
                "src/other.ts": 'export default "other";\n',
            },
            async ({ projectDir }) => {
                const mainBundle = await Bun.file(`${projectDir}/dist/main.lua`).text();

                expect(await fileExists(`${projectDir}/dist/utils/helper.lua`)).toBe(
                    false
                );
                expect(await fileExists(`${projectDir}/dist/other.lua`)).toBe(true);
                expect(mainBundle).toContain("utils.helper");
            }
        );
    });

    test("restores package.path after loading bundles with extraPaths", async () => {
        await withTranspiledProject(
            {
                "tsconfig.json": toJson(
                    createTestTsConfig({
                        ccTs: {
                            extraPaths: ["vendor", "../shared"],
                        },
                    })
                ),
                "src/main.ts": 'export default "hi";\n',
            },
            async ({ projectDir }) => {
                const bundle = await Bun.file(`${projectDir}/dist/main.lua`).text();

                expect(bundle).toContain("local ____defaultPath = package.path");
                expect(bundle).toContain(
                    'package.path = ____defaultPath..";vendor/?.lua;vendor/?/init.lua;../shared/?.lua;../shared/?/init.lua"'
                );
                expect(bundle).toContain('local ____export = require("main", ...)');
                expect(bundle).toContain("package.path = ____defaultPath");
            }
        );
    });

    test("keeps built-in modules external while bundling local modules", async () => {
        await withTranspiledProject(
            {
                "tsconfig.json": toJson(
                    createTestTsConfig({
                        ccTs: {
                            builtInModules: ["fs"],
                        },
                    })
                ),
                "src/helper.ts": 'export const helper = "helper";\n',
                "src/main.ts":
                    'declare function require(name: string): any;\nimport { helper } from "./helper";\nconst fs = require("fs");\nexport default helper + String(fs);\n',
            },
            async ({ projectDir }) => {
                const bundle = await Bun.file(`${projectDir}/dist/main.lua`).text();

                expect(bundle).toContain('["main"] = function(...)');
                expect(bundle).toContain('["helper"] = function(...)');
                expect(bundle).toContain('local fs = require(nil, "fs")');
                expect(bundle).not.toContain('["fs"] = function(...)');
            }
        );
    });

    test("emits a compact bundle when minify is enabled", async () => {
        await withTranspiledProject(
            {
                "tsconfig.json": toJson(
                    createTestTsConfig({
                        ccTs: {
                            minify: true,
                        },
                    })
                ),
                "src/main.ts": 'const value = "hi";\nexport default value;\n',
            },
            async ({ projectDir }) => {
                const bundle = await Bun.file(`${projectDir}/dist/main.lua`).text();

                expect(bundle).toContain("-- Minified: true");
                expect(bundle).toContain('a={[');
                expect(bundle).not.toContain('____modules = {\n');
            }
        );
    });

    test("surfaces semantic TypeScript diagnostics as a TranspilationError", async () => {
        await withParsedProject(
            {
                "tsconfig.json": toJson(createTestTsConfig()),
                "src/main.ts": 'const value: string = 1;\nexport default value;\n',
            },
            async ({ parsed }) => {
                await expect(transpileProjectFiles(parsed)).rejects.toMatchObject({
                    name: "TranspilationError",
                });

                try {
                    await transpileProjectFiles(parsed);
                } catch (error) {
                    expect(error).toBeInstanceOf(TranspilationError);

                    const transpilationError = error as TranspilationError;
                    expect(
                        transpilationError.diagnostics.some(
                            (diagnostic) => diagnostic.code === 2322
                        )
                    ).toBe(true);
                    expect(transpilationError.getDiagnosticsString()).toContain(
                        "Type 'number' is not assignable to type 'string'"
                    );
                    return;
                }

                throw new Error("Expected transpileProjectFiles to fail");
            }
        );
    });
});
