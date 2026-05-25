import { createTestTsConfig, toJson, type ProjectFiles } from "./projects";

export const createRichBundleProjectFiles = (): ProjectFiles => ({
    "tsconfig.json": toJson(
        createTestTsConfig({
            compilerOptions: {
                sourceMap: true,
            },
            ccTs: {
                extraPaths: ["vendor"],
                builtInModules: ["fs"],
            },
        })
    ),
    "src/utils/helper.ts": 'export const helper = "helper";\n',
    "src/main.ts":
        'declare function require(name: string): any;\nimport { helper } from "./utils/helper";\nconst fs = require("fs");\nconst map = new Map([["a", helper]]);\nexport default { helper, fs, map };\n',
});

export const createJsonModuleProjectFiles = (): ProjectFiles => ({
    "tsconfig.json": toJson(
        createTestTsConfig({
            compilerOptions: {
                resolveJsonModule: true,
            },
        })
    ),
    "src/config.json": '{"name":"builder","enabled":true}\n',
    "src/main.ts":
        'import config from "./config.json";\nexport default config.name + String(config.enabled);\n',
});

export const createCliBuildProjectFiles = (): ProjectFiles => ({
    "tsconfig.json": toJson(
        createTestTsConfig({
            ccTs: {
                ignoreAsEntryPoint: ["src/shared/**"],
            },
        })
    ),
    "src/shared/value.ts": 'export const value = "shared";\n',
    "src/main.ts":
        'import { value } from "./shared/value";\nexport default value;\n',
});

export const createExternalRuntimeProjectFiles = (): ProjectFiles => ({
    "tsconfig.json": toJson(
        createTestTsConfig({
            ccTs: {
                externals: [
                    {
                        pattern: "runtime.lib",
                        mode: "copy",
                        outDir: "vendor",
                    },
                ],
                analyze: true,
                reproducible: true,
            },
        })
    ),
    "src/runtime.lib.lua": 'return { value = "runtime" }\n',
    "src/runtime.lib.d.ts": 'declare const runtime: { value: string }; export = runtime;\n',
    "src/main.ts":
        'import runtime from "./runtime.lib";\nexport default runtime.value;\n',
});
