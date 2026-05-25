import { describe, expect, test } from "bun:test";

import { readFile, writeFile } from "node:fs/promises";

import {
    createCliBuildProjectFiles,
    createExternalRuntimeProjectFiles,
    createJsonModuleProjectFiles,
    createRichBundleProjectFiles,
} from "./utils/fixtures";
import {
    normalizeBundleOutput,
    readNormalizedDistArtifacts,
} from "./utils/artifacts";
import {
    normalizeHelpOutput,
    runBuilderCli,
    spawnBuilderCli,
} from "./utils/cli";
import { withTempProject, withTranspiledProject } from "./utils/projects";

describe("builder e2e", () => {
    test("emits a stable rich bundle shape for a multi-feature project", async () => {
        await withTranspiledProject(
            createRichBundleProjectFiles(),
            async ({ projectDir }) => {
                const bundle = await Bun.file(`${projectDir}/dist/main.lua`).text();

                expect(normalizeBundleOutput(bundle)).toMatchSnapshot();
            }
        );
    });

    test("emits stable dist artifacts for a project using json modules", async () => {
        await withTranspiledProject(
            createJsonModuleProjectFiles(),
            async ({ projectDir }) => {
                const artifacts = await readNormalizedDistArtifacts(projectDir, {
                    includeSourceMaps: false,
                });

                expect(artifacts).toMatchSnapshot();
            }
        );
    });

    test("cli build command produces expected bundled outputs from tsconfig", async () => {
        await withTempProject(createCliBuildProjectFiles(), async (projectDir) => {
            const result = await runBuilderCli(["-p", `${projectDir}/tsconfig.json`], {
                cwd: projectDir,
            });

            expect(result.exitCode).toBe(0);

            const artifacts = await readNormalizedDistArtifacts(projectDir);
            expect(artifacts).toMatchSnapshot();
        });
    });

    test("cli help output includes builder-specific options", async () => {
        const result = await runBuilderCli(["--help"]);

        expect(result.exitCode).toBe(0);
        expect(normalizeHelpOutput(result.stdout)).toMatchSnapshot();
    });

    test("cli reports serve-without-watch as a builder error", async () => {
        await withTempProject(createCliBuildProjectFiles(), async (projectDir) => {
            const result = await runBuilderCli(
                ["--serve", "-p", `${projectDir}/tsconfig.json`],
                { cwd: projectDir }
            );

            expect(result.exitCode).toBe(2);
            expect(result.stderr).toBe("");
            expect(result.stdout).toContain("error TS90002");
            expect(result.stdout).toContain(
                "The 'serve' command requires watch mode to be enabled"
            );
        });
    });

    test("cli emits analysis output and copied runtime artifacts", async () => {
        await withTempProject(
            createExternalRuntimeProjectFiles(),
            async (projectDir) => {
                const result = await runBuilderCli(
                    ["-p", `${projectDir}/tsconfig.json`],
                    { cwd: projectDir }
                );

                expect(result.exitCode).toBe(0);
                expect(result.stdout).toContain("Build analysis");

                const artifacts = await readNormalizedDistArtifacts(projectDir, {
                    includeSourceMaps: false,
                });
                expect(artifacts).toMatchSnapshot();
            }
        );
    });

    test("watch mode rebuilds entry bundles when a shared dependency changes", async () => {
        await withTempProject(
            {
                "tsconfig.json": JSON.stringify(
                    {
                        compilerOptions: {
                            target: "ESNext",
                            module: "ESNext",
                            moduleResolution: "bundler",
                            rootDir: "src",
                            outDir: "dist",
                            strict: true,
                            skipLibCheck: true,
                            types: [],
                            incremental: true,
                        },
                        tstl: {
                            luaTarget: "CC-5.2",
                            luaLibImport: "require-minimal",
                            buildMode: "default",
                        },
                        include: ["src/**/*.ts"],
                    },
                    null,
                    2
                ),
                "src/shared.ts": 'export const shared = "before";\n',
                "src/main.ts":
                    'import { shared } from "./shared";\nexport default shared;\n',
            },
            async (projectDir) => {
                const watch = spawnBuilderCli(
                    ["--watch", "-p", `${projectDir}/tsconfig.json`],
                    { cwd: projectDir }
                );

                try {
                    for (let i = 0; i < 30; i++) {
                        if (await Bun.file(`${projectDir}/dist/main.lua`).exists()) {
                            break;
                        }
                        await Bun.sleep(100);
                    }

                    const before = await readFile(
                        `${projectDir}/dist/main.lua`,
                        "utf8"
                    );
                    expect(before).toContain("before");

                    await writeFile(
                        `${projectDir}/src/shared.ts`,
                        'export const shared = "after";\n',
                        "utf8"
                    );

                    let after = before;
                    for (let i = 0; i < 40; i++) {
                        await Bun.sleep(100);
                        after = await readFile(`${projectDir}/dist/main.lua`, "utf8");
                        if (after.includes("after")) {
                            break;
                        }
                    }

                    expect(after).toContain("after");
                } finally {
                    watch.kill();
                    await watch.exited;
                }
            }
        );
    });
});
