import { describe, expect, test } from "bun:test";
import * as path from "node:path";

describe("package surface", () => {
    test("exports the public builder API from src/index.ts", async () => {
        const api = await import("../src/index.ts");

        expect(typeof api.transpileProjectFiles).toBe("function");
        expect(typeof api.parseConfigFileWithSystem).toBe("function");
        expect(typeof api.formatAnalysisReport).toBe("function");
        expect(typeof api.CCBundler).toBe("function");
    });

    test("package.json points at the public entrypoints", async () => {
        const packageJson = (await Bun.file(
            path.join(import.meta.dir, "..", "package.json")
        ).json()) as {
            main?: string;
            module?: string;
            exports?: Record<string, string>;
            bin?: Record<string, string>;
        };

        expect(packageJson.main).toBe("src/index.ts");
        expect(packageJson.module).toBe("src/index.ts");
        expect(packageJson.exports?.["."]).toBe("./src/index.ts");
        expect(packageJson.exports?.["./cli"]).toBe("./src/cc-ts.ts");
        expect(packageJson.bin?.["cc-ts"]).toBe("src/cc-ts.ts");
    });
});
