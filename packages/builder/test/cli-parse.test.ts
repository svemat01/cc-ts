import { describe, expect, test } from "bun:test";

import { parseCommandLine } from "../src/cli/parse";

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

    test("accepts kebab-case flags and parses boolean false values", () => {
        const result = parseCommandLine([
            "--serve-port",
            "9300",
            "--debug",
            "false",
            "--extra-paths",
            "vendor,lib",
        ]);

        expect(result.errors).toHaveLength(0);
        expect(result.options.servePort).toBe(9300);
        expect(result.options.debug).toBe(false);
        expect(result.options.extraPaths).toEqual(["vendor", "lib"]);
    });

    test("reports invalid value types for custom builder flags", () => {
        const result = parseCommandLine(["--servePort", "abc"]);

        expect(result.options.servePort).toBeUndefined();
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(5024);
        expect(String(result.errors[0].messageText)).toContain(
            "requires a value of type number"
        );
    });

    test("reports missing values for non-boolean builder flags", () => {
        const result = parseCommandLine(["--servePort"]);

        expect(result.options.servePort).toBeUndefined();
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(6044);
        expect(String(result.errors[0].messageText)).toContain(
            "expects an argument"
        );
    });
});
