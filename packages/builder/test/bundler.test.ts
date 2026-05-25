import { describe, expect, test } from "bun:test";
import * as ts from "typescript";

import { CCBundler } from "../src/bundler";
import {
    createProgramForBundler,
    createTestTsConfig,
    toJson,
    withTempProject,
} from "./utils/projects";

describe("CCBundler", () => {
    test("reports a builder diagnostic when a bundled dependency is missing", async () => {
        await withTempProject(
            {
                "tsconfig.json": toJson(createTestTsConfig()),
                "src/main.ts": "export default 1;\n",
            },
            async (projectDir) => {
                const program = createProgramForBundler(projectDir);
                const diagnostics: ts.Diagnostic[] = [];
                const bundler = new CCBundler(
                    [
                        {
                            fileName: `${projectDir}/src/main.ts`,
                            code: 'local missing = require("missing.module")\nreturn { default = missing }\n',
                        },
                    ],
                    program,
                    ts.sys,
                    diagnostics
                );

                const bundle = bundler.bundleModule("main");

                expect(bundle).toBeUndefined();
                expect(
                    diagnostics.some((diagnostic) => diagnostic.code === 90004)
                ).toBe(true);

                const dependencyDiagnostic = diagnostics.find(
                    (diagnostic) =>
                        diagnostic.code === 90004 &&
                        String(diagnostic.messageText).includes(
                            "required as a dependency"
                        )
                );

                expect(dependencyDiagnostic).toBeDefined();
                expect(String(dependencyDiagnostic!.messageText)).toContain(
                    "missing.module"
                );
            }
        );
    });

    test("reports a builder diagnostic when the requested entry module is missing", async () => {
        await withTempProject(
            {
                "tsconfig.json": toJson(createTestTsConfig()),
                "src/main.ts": "export default 1;\n",
            },
            async (projectDir) => {
                const program = createProgramForBundler(projectDir);
                const diagnostics: ts.Diagnostic[] = [];
                const bundler = new CCBundler([], program, ts.sys, diagnostics);

                const bundle = bundler.bundleModule("missing.entry");

                expect(bundle).toBeUndefined();
                expect(diagnostics).toHaveLength(1);
                expect(diagnostics[0].code).toBe(90003);
                expect(String(diagnostics[0].messageText)).toContain(
                    "missing.entry"
                );
            }
        );
    });
});
