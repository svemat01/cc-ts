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
import * as ts from "typescript";

import { parseConfigFileWithSystem } from "../../src/cli/tsconfig";
import { transpileProjectFiles } from "../../src/transpiler";

export type ProjectFiles = Record<string, string>;

interface TestTsConfigInput {
    compilerOptions?: Record<string, unknown>;
    tstl?: Record<string, unknown>;
    ccTs?: Record<string, unknown>;
    include?: string[];
    [key: string]: unknown;
}

export const createTestTsConfig = ({
    compilerOptions = {},
    tstl = {},
    ccTs = {},
    include = ["src/**/*.ts"],
    ...rest
}: TestTsConfigInput = {}) => ({
    ...rest,
    compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        rootDir: "src",
        outDir: "dist",
        strict: true,
        skipLibCheck: true,
        types: [],
        ...compilerOptions,
    },
    tstl: {
        luaTarget: "CC-5.2",
        luaLibImport: "require-minimal",
        buildMode: "default",
        ...tstl,
    },
    ...(Object.keys(ccTs).length > 0 ? { "cc-ts": ccTs } : {}),
    include,
});

export const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export async function writeProjectFiles(
    projectDir: string,
    files: ProjectFiles
) {
    for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(projectDir, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content, "utf8");
    }
}

export async function withTempProject<T>(
    files: ProjectFiles,
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

export async function fileExists(filePath: string) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function withParsedProject<T>(
    files: ProjectFiles,
    run: (context: {
        projectDir: string;
        parsed: ReturnType<typeof parseConfigFileWithSystem>;
    }) => Promise<T>,
    configFileName = "tsconfig.json"
) {
    return withTempProject(files, async (projectDir) => {
        const parsed = parseConfigFileWithSystem(
            path.join(projectDir, configFileName)
        );

        return run({ projectDir, parsed });
    });
}

export async function withTranspiledProject<T>(
    files: ProjectFiles,
    run: (context: {
        projectDir: string;
        parsed: ReturnType<typeof parseConfigFileWithSystem>;
        result: Awaited<ReturnType<typeof transpileProjectFiles>>;
    }) => Promise<T>,
    configFileName = "tsconfig.json"
) {
    return withTempProject(files, async (projectDir) => {
        const parsed = parseConfigFileWithSystem(
            path.join(projectDir, configFileName)
        );
        const result = await transpileProjectFiles(parsed);

        return run({ projectDir, parsed, result });
    });
}

export function createProgramForBundler(
    projectDir: string,
    rootNames = [path.join(projectDir, "src/main.ts")],
    options: ts.CompilerOptions = {}
) {
    return ts.createProgram({
        rootNames,
        options: {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            rootDir: path.join(projectDir, "src"),
            outDir: path.join(projectDir, "dist"),
            configFilePath: path.join(projectDir, "tsconfig.json"),
            skipLibCheck: true,
            ...options,
        },
    });
}
