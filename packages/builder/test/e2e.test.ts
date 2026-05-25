import { describe, expect, test } from "bun:test";

import {
    createCliBuildProjectFiles,
    createJsonModuleProjectFiles,
    createRichBundleProjectFiles,
} from "./utils/fixtures";
import {
    normalizeBundleOutput,
    readNormalizedDistArtifacts,
} from "./utils/artifacts";
import { normalizeHelpOutput, runBuilderCli } from "./utils/cli";
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
});
