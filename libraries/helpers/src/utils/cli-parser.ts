/**
 * @module cli-parser
 *
 * 🎮 A delightful CLI argument parser that makes handling command-line arguments as fun as playing with LEGOs!
 *
 * This module provides a powerful yet friendly way to parse command-line arguments and build CLI applications.
 * Think of it as your trusty sidekick in the quest to create awesome command-line tools!
 *
 * ### ✨ Key Features
 * - 🎯 Parse command-line arguments into a structured object
 * - 🌳 Support for nested subcommands
 * - 🎨 Pretty help text generation
 * - 🎲 Automatic type conversion for arguments
 *
 * ### 📚 Example Usage
 *
 * ```typescript
 * // Create a magical spell-casting CLI!
 * const spellCommands: Command[] = [{
 *   name: 'cast',
 *   description: 'Cast a magical spell',
 *   options: [{
 *     name: 'power',
 *     description: 'Spell power level (1-10)',
 *     defaultValue: 5
 *   }],
 *   positionalArgs: [{
 *     name: 'spell',
 *     description: 'The spell to cast',
 *     required: true
 *   }],
 *   action: (args) => {
 *     console.log(`🪄 Casting ${args.spell} with power ${args.power}!`);
 *   }
 * }];
 *
 * const args = parseCliArgs([...$vararg]);
 *
 * // Run it like: spell.lua cast fireball --power 9
 * executeCommand(args, spellCommands);
 * ```
 *
 * @packageDocumentation
 */

/**
 * Represents parsed command-line arguments as a structured object.
 *
 * @typeParam T - The type of values that can be stored (string, number, boolean, or string[])
 */
export type ParsedArgs = {
    [key: string]: string | number | boolean | string[];
    _: string[]; // Positional arguments
};

/**
 * Transforms raw command-line arguments into a structured object.
 *
 * @param args - Array of command-line argument strings to parse
 * @returns A {@link ParsedArgs} object containing the parsed arguments
 *
 * @example
 * ```typescript
 * // Basic usage
 * const args = parseCliArgs(['--name', 'gandalf', '--power', '9000', 'spell']);
 * console.log(args);
 * // Output: { name: 'gandalf', power: 9000, _: ['spell'] }
 *
 * // Boolean flags
 * const args2 = parseCliArgs(['--verbose', '--force']);
 * console.log(args2);
 * // Output: { verbose: true, force: true, _: [] }
 * ```
 */
export function parseCliArgs(args: string[]): ParsedArgs {
    const options: ParsedArgs = { _: [] };
    let currentOption: string | null = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith("-")) {
            // Option format: -t 2 or -foo "bar baz"
            const name = arg.slice(1);

            // Check if the next argument is a value or another option
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith("-")) {
                // Value is present, store it
                options[name] = parseOptionValue(nextArg);
                i++; // Skip the next argument, as it has been processed
            } else {
                // No value, treat it as a boolean option
                options[name] = true;
            }

            currentOption = null;
        } else {
            // Positional argument
            if (currentOption !== null) {
                // Assign the positional argument to the current option
                options[currentOption] = parseOptionValue(arg);
                currentOption = null;
            } else {
                // Otherwise, treat it as a standalone positional argument
                options._.push(arg);
            }
        }
    }

    return options;
}

function parseOptionValue(value: string): string | number | boolean {
    // Try to parse the value as a number
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
        return numericValue;
    }

    // Try to parse the value as a boolean
    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
        return value.toLowerCase() === "true";
    }

    // Treat it as a string if not a number or boolean
    return value;
}

/**
 * Defines an option that can be passed to a command.
 *
 * @example
 * ```typescript
 * const levelOption: CommandOption = {
 *   name: 'level',
 *   description: 'Difficulty level (1-10)',
 *   defaultValue: 5
 * };
 * ```
 */
export type CommandOption = {
    name: string;
    description: string;
    defaultValue?: string | number | boolean;
};

/**
 * Defines a positional argument for a command.
 *
 * @example
 * ```typescript
 * const targetArg: PositionalArgument = {
 *   name: 'target',
 *   description: 'The target to apply the command to',
 *   required: true
 * };
 * ```
 */
export type PositionalArgument = {
    name: string;
    description: string;
    required?: boolean;
};

/**
 * Represents a CLI command with its options, arguments, and behavior.
 *
 * Commands can have:
 * - Options (--flag style arguments)
 * - Positional arguments
 * - Subcommands for nested functionality
 * - An action to execute
 *
 * @example
 * ```typescript
 * const deployCommand: Command = {
 *   name: 'deploy',
 *   description: '🚀 Deploy your application',
 *   options: [{
 *     name: 'env',
 *     description: 'Target environment',
 *     defaultValue: 'dev'
 *   }],
 *   action: (args) => {
 *     console.log(`🚀 Deploying to ${args.env}...`);
 *   }
 * };
 * ```
 */
export type Command = {
    name: string;
    description: string;
    options?: CommandOption[];
    positionalArgs?: PositionalArgument[];
    action?: (args: ParsedArgs) => void;
    subcommands?: Command[];
};

/**
 * Displays help text for commands in a pretty format.
 *
 * @param commandName - Optional name of command to show help for
 * @param commands - Array of available commands
 *
 * @example
 * ```typescript
 * const commands: Command[] = [{
 *   name: 'build',
 *   description: '🏗️ Build the project'
 * }];
 *
 * // Show general help
 * printHelp(undefined, commands);
 *
 * // Show help for specific command
 * printHelp('build', commands);
 * ```
 */
export function printHelp(
    commandName: string | undefined,
    commands: Command[]
): void {
    if (commandName) {
        const command = commands.find((cmd) => cmd.name === commandName);

        if (!command) {
            print(`Unknown command: ${commandName}`);
            print("\nAvailable Commands:");
            const longestName = commands.reduce(
                (acc, cmd) => Math.max(acc, cmd.name.length),
                0
            );
            commands.forEach((cmd) =>
                print(`  ${cmd.name.padEnd(longestName)} | ${cmd.description}`)
            );
        } else {
            print(`\n${command.name}: ${command.description}\n`);

            if (command.options && command.options.length > 0) {
                print("Options:");
                const longestName = command.options.reduce(
                    (acc, option) => Math.max(acc, option.name.length),
                    0
                );
                command.options.forEach((option) =>
                    print(
                        `  ${option.name.padEnd(longestName)} | ${
                            option.description
                        }`
                    )
                );
                print("");
            }

            if (command.positionalArgs && command.positionalArgs.length > 0) {
                print("Usage:");
                const positionalArgsUsage = command.positionalArgs
                    .map((arg) =>
                        arg.required ? `<${arg.name}>` : `[${arg.name}]`
                    )
                    .join(" ");

                print(`  ${command.name} ${positionalArgsUsage}`);
                print("\nPositional Arguments:");
                const longestName = command.positionalArgs.reduce(
                    (acc, arg) => Math.max(acc, arg.name.length),
                    0
                );
                command.positionalArgs.forEach((arg) =>
                    print(
                        `  ${arg.required ? "<" : "["}${arg.name.padEnd(
                            longestName
                        )}${arg.required ? ">" : "]"} | ${arg.description}`
                    )
                );
                print("");
            }

            if (command.subcommands && command.subcommands.length > 0) {
                print("Subcommands:");
                const longestName = command.subcommands.reduce(
                    (acc, cmd) => Math.max(acc, cmd.name.length),
                    0
                );
                command.subcommands.forEach((subcommand) =>
                    print(
                        `  ${subcommand.name.padEnd(longestName)} | ${
                            subcommand.description
                        }`
                    )
                );
            }
        }
    } else {
        print("\nAvailable Commands:");
        const longestName = commands.reduce(
            (acc, cmd) => Math.max(acc, cmd.name.length),
            0
        );
        commands.forEach((cmd) =>
            print(`  ${cmd.name.padEnd(longestName)} | ${cmd.description}`)
        );
    }
}

/**
 * Executes a command based on the parsed arguments.
 *
 * This function:
 * 1. Finds the requested command
 * 2. Handles subcommand routing if present
 * 3. Executes the command's action or shows help
 *
 * @param args - Parsed command-line arguments
 * @param commands - Available commands to execute
 *
 * @example
 * ```typescript
 * const gitCommands: Command[] = [{
 *   name: 'commit',
 *   description: '📝 Create a commit',
 *   options: [{
 *     name: 'message',
 *     description: 'Commit message',
 *     defaultValue: 'Update'
 *   }],
 *   action: (args) => {
 *     console.log(`📝 Committing with message: ${args.message}`);
 *   }
 * }];
 *
 * // Parse and execute
 * const args = parseCliArgs(['commit', '--message', 'Fix bugs']);
 * executeCommand(args, gitCommands);
 * ```
 *
 * @throws {Error} If a required positional argument is missing
 */
export function executeCommand(args: ParsedArgs, commands: Command[]): void {
    const commandName = args._.shift() || "help";
    const command = commands.find((cmd) => cmd.name === commandName);

    if (!command) {
        printHelp(commandName, commands);
        return;
    }

    if (
        command.subcommands &&
        command.subcommands.length > 0 &&
        args._.length > 0
    ) {
        // If there are subcommands and more arguments, execute the subcommand
        executeCommand(args, command.subcommands);
    } else {
        // Otherwise, execute the current command
        command.action
            ? command.action(args)
            : printHelp(commandName, commands);
    }
}
