import { describe, expect, test } from "bun:test";

import { getInvalidatedSourceFiles } from "../src/watch";
import {
    createProgramForBundler,
    createTestTsConfig,
    toJson,
    withTempProject,
} from "./utils/projects";

describe("watch invalidation", () => {
    test("rebuilds entrypoints that depend on a changed shared module", async () => {
        await withTempProject(
            {
                "tsconfig.json": toJson(createTestTsConfig()),
                "src/shared.ts": 'export const shared = "shared";\n',
                "src/main.ts":
                    'import { shared } from "./shared";\nexport default shared;\n',
                "src/other.ts":
                    'import { shared } from "./shared";\nexport default shared;\n',
            },
            async (projectDir) => {
                const program = createProgramForBundler(projectDir, [
                    `${projectDir}/src/main.ts`,
                    `${projectDir}/src/other.ts`,
                    `${projectDir}/src/shared.ts`,
                ]);

                const sourceFiles = getInvalidatedSourceFiles(
                    {
                        entryModules: {
                            main: `${projectDir}/src/main.ts`,
                            other: `${projectDir}/src/other.ts`,
                        },
                        moduleFiles: {
                            main: `${projectDir}/src/main.ts`,
                            other: `${projectDir}/src/other.ts`,
                            shared: `${projectDir}/src/shared.ts`,
                        },
                        moduleDependencies: {
                            main: ["shared"],
                            other: ["shared"],
                            shared: [],
                        },
                    },
                    [`${projectDir}/src/shared.ts`],
                    program
                );

                expect(sourceFiles?.map((file) => file.fileName).sort()).toEqual([
                    `${projectDir}/src/main.ts`,
                    `${projectDir}/src/other.ts`,
                    `${projectDir}/src/shared.ts`,
                ]);
            }
        );
    });

    test("falls back to a full rebuild for unknown changed files", async () => {
        await withTempProject(
            {
                "tsconfig.json": toJson(createTestTsConfig()),
                "src/main.ts": 'export default "main";\n',
            },
            async (projectDir) => {
                const program = createProgramForBundler(projectDir);

                const sourceFiles = getInvalidatedSourceFiles(
                    {
                        entryModules: {
                            main: `${projectDir}/src/main.ts`,
                        },
                        moduleFiles: {
                            main: `${projectDir}/src/main.ts`,
                        },
                        moduleDependencies: {
                            main: [],
                        },
                    },
                    [`${projectDir}/src/unknown.ts`],
                    program
                );

                expect(sourceFiles).toBeUndefined();
            }
        );
    });
});
