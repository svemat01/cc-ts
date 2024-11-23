import { optionDeclarations } from "./parse";
import { version as tstlVersion } from "@cc-ts/typescript-to-lua/package.json";

import { version } from "../../package.json";
export { version };
export const versionString = `Version ${version} (TSTL ${tstlVersion})`;

const helpString = `
Syntax:   cc-ts [options] [files...]

Examples: cc-ts path/to/file.ts [...]
          cc-ts -p path/to/tsconfig.json

In addition to the options listed below you can also pass options
for the typescript compiler (For a list of options use tsc -h).
Some tsc options might have no effect.
`.trim();

export function getHelpString(): string {
    let result = helpString + "\n\n";

    result += "Options:\n";
    for (const option of optionDeclarations) {
        const aliasStrings = (option.aliases ?? []).map((a) => "-" + a);
        const optionString = [...aliasStrings, "--" + option.name].join("|");

        const valuesHint =
            option.type === "enum" ? option.choices.join("|") : option.type;
        const spacing = " ".repeat(
            Math.max(1, 45 - optionString.length - valuesHint.length)
        );

        result += `\n ${optionString} <${valuesHint}>${spacing}${option.description}\n`;
    }

    return result;
}
