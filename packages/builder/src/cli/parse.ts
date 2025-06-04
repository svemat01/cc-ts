import * as ts from "typescript";
import * as cliDiagnostics from "@cc-ts/typescript-to-lua/dist/cli/diagnostics";
import * as tstl from "@cc-ts/typescript-to-lua";
import type { CCTSOptions, CompilerOptions } from "../CompilerOptions";
import type { ParsedCommandLine as TstlParsedCommandLine } from "@cc-ts/typescript-to-lua";

export interface ParsedCommandLine extends TstlParsedCommandLine {
    options: CompilerOptions;
}

interface CommandLineOptionBase {
    aliases?: string[];
    description: string;
}

interface CommandLineOptionOfEnum extends CommandLineOptionBase {
    type: "enum";
    choices: string[];
}

interface CommandLineOptionOfPrimitive extends CommandLineOptionBase {
    type: "boolean" | "string" | "json-array-of-objects" | "array" | "number";
}

type CommandLineOption = CommandLineOptionOfEnum | CommandLineOptionOfPrimitive;

export const optionDeclarations: Record<keyof CCTSOptions, CommandLineOption> = {
    minify: {
        description: "Minify the resulting Lua files.",
        type: "boolean",
    },
    builtInModules: {
        description: "A list of built-in modules to include in the bundle.",
        type: "array",
    },
    serve: {
        description: "Serve the bundle over HTTP.",
        type: "boolean",
    },
    servePort: {
        description: "The port to serve the bundle on.",
        type: "number",
        aliases: ["sp"],
    },
    debug: {
        description: "Enable debug mode.",
        type: "boolean",
    },
    extraPaths: {
        description: "A list of extra paths to include in the bundle.",
        type: "array",
    },
    ignoreAsEntryPoint: {
        description: "A list of files to ignore as entry points.",
        type: "array",
    },
};

// lookup of alias to option name
const optionAliasLookup: Record<string, string> = {};
for (const [name, option] of Object.entries(optionDeclarations)) {
    if ("aliases" in option && option.aliases) {
        for (const alias of option.aliases) {
            optionAliasLookup[alias] = name;
        }
    }
}

export function updateParsedConfigFile(
    parsedConfigFile: ts.ParsedCommandLine
): ParsedCommandLine {
    let hasRootLevelOptions = false;
    for (const [name, rawValue] of Object.entries(parsedConfigFile.raw)) {
        const option =
            optionDeclarations[name as keyof typeof optionDeclarations];
        if (!option) continue;

        if (parsedConfigFile.raw["cc-ts"] === undefined)
            parsedConfigFile.raw["cc-ts"] = {};
        parsedConfigFile.raw["cc-ts"][name] = rawValue;
        hasRootLevelOptions = true;
    }

    if (parsedConfigFile.raw["cc-ts"]) {
        if (hasRootLevelOptions) {
            parsedConfigFile.errors.push(
                cliDiagnostics.tstlOptionsAreMovingToTheTstlObject(
                    parsedConfigFile.raw["cc-ts"]
                )
            );
        }

        for (const [name, rawValue] of Object.entries(
            parsedConfigFile.raw["cc-ts"]
        )) {
            const option =
                optionDeclarations[name as keyof typeof optionDeclarations];
            if (!option) {
                parsedConfigFile.errors.push(
                    cliDiagnostics.unknownCompilerOption(name)
                );
                continue;
            }

            const { error, value } = readValue(
                option,
                name,
                rawValue,
                OptionSource.TsConfig
            );
            if (error) parsedConfigFile.errors.push(error);
            if (parsedConfigFile.options[name] === undefined)
                parsedConfigFile.options[name] = value;
        }
    }

    return parsedConfigFile;
}

export function parseCommandLine(args: string[]): ParsedCommandLine {
    return updateParsedCommandLine(tstl.parseCommandLine(args), args);
}

function updateParsedCommandLine(
    parsedCommandLine: ts.ParsedCommandLine,
    args: string[]
): ParsedCommandLine {
    for (let i = 0; i < args.length; i++) {
        if (!args[i].startsWith("-")) continue;

        const isShorthand = !args[i].startsWith("--");
        const argumentName = args[i]
            .substring(isShorthand ? 1 : 2)
            .toLowerCase();
        const option =
            optionDeclarations[
                argumentName as keyof typeof optionDeclarations
            ] ??
            optionDeclarations[
                optionAliasLookup[
                    argumentName
                ] as keyof typeof optionDeclarations
            ];

        if (option) {
            // Ignore errors caused by ccts specific compiler options
            parsedCommandLine.errors = parsedCommandLine.errors.filter(
                // TS5023: Unknown compiler option '{0}'.
                // TS5025: Unknown compiler option '{0}'. Did you mean '{1}'?
                (e) =>
                    !(
                        (e.code === 5023 || e.code === 5025) &&
                        String(e.messageText).includes(`'${args[i]}'.`)
                    )
            );

            const { error, value, consumed } = readCommandLineArgument(
                option,
                argumentName,
                args[i + 1]
            );
            if (error) parsedCommandLine.errors.push(error);
            parsedCommandLine.options[argumentName] = value;
            if (consumed) {
                // Values of custom options are parsed as a file name, exclude them
                parsedCommandLine.fileNames =
                    parsedCommandLine.fileNames.filter(
                        (f) => f !== args[i + 1]
                    );
                i += 1;
            }
        }
    }

    return parsedCommandLine;
}

interface CommandLineArgument extends ReadValueResult {
    consumed: boolean;
}

function readCommandLineArgument(
    option: CommandLineOption,
    name: string,
    value: any
): CommandLineArgument {
    if (option.type === "boolean") {
        if (value === "true" || value === "false") {
            value = value === "true";
        } else {
            // Set boolean arguments without supplied value to true
            return { value: true, consumed: false };
        }
    }

    if (value === undefined) {
        return {
            error: cliDiagnostics.compilerOptionExpectsAnArgument(name),
            value: undefined,
            consumed: false,
        };
    }

    return {
        ...readValue(option, name, value, OptionSource.CommandLine),
        consumed: true,
    };
}

enum OptionSource {
    CommandLine,
    TsConfig,
}

interface ReadValueResult {
    error?: ts.Diagnostic;
    value: any;
}

function readValue(
    option: CommandLineOption,
    name: string,
    value: unknown,
    source: OptionSource
): ReadValueResult {
    if (value === null) return { value };

    switch (option.type) {
        case "boolean":
        case "string": {
            if (typeof value !== option.type) {
                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionRequiresAValueOfType(
                        name,
                        option.type
                    ),
                };
            }

            return { value };
        }

        case "number": {
            let num = Number(value);
            if (isNaN(num)) {
                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionRequiresAValueOfType(
                        name,
                        "number"
                    ),
                };
            }

            return { value: num };
        }

        case "array":
        case "json-array-of-objects": {
            const isInvalidNonCliValue =
                source === OptionSource.TsConfig && !Array.isArray(value);
            const isInvalidCliValue =
                source === OptionSource.CommandLine &&
                typeof value !== "string";

            if (isInvalidNonCliValue || isInvalidCliValue) {
                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionRequiresAValueOfType(
                        name,
                        option.type
                    ),
                };
            }

            const shouldParseValue =
                source === OptionSource.CommandLine &&
                typeof value === "string";
            if (!shouldParseValue) return { value };

            if (option.type === "array") {
                const array = value.split(",");
                return { value: array };
            }

            try {
                const objects = JSON.parse(value);
                if (!Array.isArray(objects)) {
                    return {
                        value: undefined,
                        error: cliDiagnostics.compilerOptionRequiresAValueOfType(
                            name,
                            option.type
                        ),
                    };
                }

                return { value: objects };
            } catch (e) {
                if (!(e instanceof SyntaxError)) throw e;

                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionCouldNotParseJson(
                        name,
                        e.message
                    ),
                };
            }
        }
        case "enum": {
            if (typeof value !== "string") {
                return {
                    value: undefined,
                    error: cliDiagnostics.compilerOptionRequiresAValueOfType(
                        name,
                        "string"
                    ),
                };
            }

            const enumValue = option.choices.find(
                (c) => c.toLowerCase() === value.toLowerCase()
            );
            if (enumValue === undefined) {
                const optionChoices = option.choices.join(", ");
                return {
                    value: undefined,
                    error: cliDiagnostics.argumentForOptionMustBe(
                        `--${name}`,
                        optionChoices
                    ),
                };
            }

            return { value: enumValue };
        }
    }
}
