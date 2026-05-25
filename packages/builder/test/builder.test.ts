import { describe, expect, test } from "bun:test";
import {
    access,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { validateOptions } from "../src/CompilerOptions";
import { parseCommandLine } from "../src/cli/parse";
import { parseConfigFileWithSystem } from "../src/cli/tsconfig";
import { transpileProjectFiles } from "../src/transpiler";

const createTestTsConfig = (ccTsOptions: Record<string, unknown> = {}) => ({
    compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        rootDir: "src",
        outDir: "dist",
        strict: true,
        skipLibCheck: true,
        types: [],
    },
    tstl: {
        luaTarget: "CC-5.2",
        luaLibImport: "require-minimal",
        buildMode: "default",
    },
    ...(Object.keys(ccTsOptions).length > 0 ? { "cc-ts": ccTsOptions } : {}),
    include: ["src/**/*.ts"],
});

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function writeProjectFiles(
    projectDir: string,
    files: Record<string, string>
) {
    for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(projectDir, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content, "utf8");
    }
}

async function withTempProject<T>(
    files: Record<string, string>,
    run: (projectDir: string) => Promise<T>
) {
    const projectDir = await mkdtemp(path.join(tmpdir(), "cc-ts-builder-"));

    try {
        await writeProjectFiles(projectDir, files);
        return await run(projectDir);
    } finally {
        await rm(projectDir, { recursive: true, force: true });
    }
}

async function fileExists(filePath: string) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

describe("parseCommandLine", () => {
    test("parses documented cc-ts long options into canonical compiler options", () => {
        const result = parseCommandLine([
            "--minify",
            "--servePort",
            "9100",
            "--builtInModules",
            "fs,http",
            "--ignoreAsEntryPoint",
            "src/utils/**",
            "src/main.ts",
        ]);

        expect(result.errors).toHaveLength(0);
        expect(result.fileNames).toEqual(["src/main.ts"]);
        expect(result.options.minify).toBe(true);
        expect(result.options.servePort).toBe(9100);
        expect(result.options.builtInModules).toEqual(["fs", "http"]);
        expect(result.options.ignoreAsEntryPoint).toEqual(["src/utils/**"]);
    });

    test("stores aliased options on their canonical key", () => {
        const result = parseCommandLine(["-sp", "9200"]);

        expect(result.errors).toHaveLength(0);
        expect(result.options.servePort).toBe(9200);
        expect(result.options.sp).toBeUndefined();
        expect(result.fileNames).toHaveLength(0);
    });
});

describe("parseConfigFileWithSystem", () => {
    test("inherits cc-ts options from extended configs", async () => {
        await withTempProject(
            {
                "src/main.ts": "export const value = 1;\n",
                "base.json": toJson(
                    createTestTsConfig({
                        minify: true,
                        builtInModules: ["fs"],
                        ignoreAsEntryPoint: ["src/generated/**"],
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
                    path.join(projectDir, "tsconfig.json")
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
});

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
                    path.join(projectDir, "tsconfig.json")
                );
                const result = await transpileProjectFiles(parsed);

                expect(result.emitSkipped).toBe(false);

                const mainBundle = await readFile(
                    path.join(projectDir, "dist/main.lua"),
                    "utf8"
                );
                const otherBundle = await readFile(
                    path.join(projectDir, "dist/other.lua"),
                    "utf8"
                );

                expect(
                    await fileExists(path.join(projectDir, "dist/shared.lib.lua"))
                ).toBe(false);
                expect(mainBundle).toContain('["main"] = function(...)');
                expect(mainBundle).toContain("shared.lib");
                expect(mainBundle).toContain("-- Entry: main");
                expect(mainBundle).toContain("-- Files:");
                expect(mainBundle).toContain("main.ts");
                expect(mainBundle).toContain("shared.lib.ts");
                expect(mainBundle).not.toContain("{#Hash}");
                expect(otherBundle).toContain("-- Entry: other");
            }
        );
    });

    test("supports project-relative ignoreAsEntryPoint glob patterns", async () => {
        await withTempProject(
            {
                "tsconfig.json": toJson(
                    createTestTsConfig({
                        ignoreAsEntryPoint: ["src/utils/**"],
                    })
                ),
                "src/utils/helper.ts": 'export const helper = "helper";\n',
                "src/main.ts":
                    'import { helper } from "./utils/helper";\nexport default helper;\n',
                "src/other.ts": 'export default "other";\n',
            },
            async (projectDir) => {
                const parsed = parseConfigFileWithSystem(
                    path.join(projectDir, "tsconfig.json")
                );
                await transpileProjectFiles(parsed);

                const mainBundle = await readFile(
                    path.join(projectDir, "dist/main.lua"),
                    "utf8"
                );

                expect(
                    await fileExists(path.join(projectDir, "dist/utils/helper.lua"))
                ).toBe(false);
                expect(
                    await fileExists(path.join(projectDir, "dist/other.lua"))
                ).toBe(true);
                expect(mainBundle).toContain("utils.helper");
            }
        );
    });
});
