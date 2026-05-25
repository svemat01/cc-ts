import * as path from "node:path";
import { fileURLToPath } from "node:url";

const cliEntryFile = fileURLToPath(new URL("../../src/cc-ts.ts", import.meta.url));

export async function runBuilderCli(
    args: string[],
    options: {
        cwd?: string;
        env?: Record<string, string>;
    } = {}
) {
    const subprocess = Bun.spawn({
        cmd: [process.execPath, cliEntryFile, ...args],
        cwd: options.cwd,
        env: {
            ...process.env,
            ...options.env,
        },
        stdout: "pipe",
        stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(subprocess.stdout).text(),
        new Response(subprocess.stderr).text(),
        subprocess.exited,
    ]);

    return {
        exitCode,
        stdout,
        stderr,
    };
}

export const normalizeHelpOutput = (output: string) =>
    output.replace(/^Version .+$/m, "Version <builder> (TSTL <tstl>)");

export const normalizeCliPath = (value: string) => value.replaceAll(path.sep, "/");
