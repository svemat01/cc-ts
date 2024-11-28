export type ParsedArgs = {
    [key: string]: string | number | boolean | string[];
    _: string[];
};

export function parseCliArgs(args: string[]): ParsedArgs {
    const options: ParsedArgs = { _: [] };
    let currentOption: string | null = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('-')) {
            // Option format: -t 2 or -foo "bar baz"
            const name = arg.slice(1);

            // Check if the next argument is a value or another option
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('-')) {
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
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return value.toLowerCase() === 'true';
    }

    // Treat it as a string if not a number or boolean
    return value;
}

export type CommandOption = {
  name: string;
  description: string;
  defaultValue?: string | number | boolean;
};

export type PositionalArgument = {
  name: string;
  description: string;
  required?: boolean;
};

export type Command = {
  name: string;
  description: string;
  options?: CommandOption[];
  positionalArgs?: PositionalArgument[];
  action?: (args: ParsedArgs) => void;
  subcommands?: Command[];
};

export function printHelp(commandName: string | undefined, commands: Command[]): void {
  if (commandName) {
    const command = commands.find((cmd) => cmd.name === commandName);

    if (!command) {
      print(`Unknown command: ${commandName}`);
      print('\nAvailable Commands:');
      const longestName = commands.reduce((acc, cmd) => Math.max(acc, cmd.name.length), 0);
      commands.forEach((cmd) => print(`  ${cmd.name.padEnd(longestName)} | ${cmd.description}`));
    } else {
      print(`\n${command.name}: ${command.description}\n`);

      if (command.options && command.options.length > 0) {
        print('Options:');
        const longestName = command.options.reduce(
          (acc, option) => Math.max(acc, option.name.length),
          0
        );
        command.options.forEach((option) =>
          print(`  ${option.name.padEnd(longestName)} | ${option.description}`)
        );
        print('');
      }

      if (command.positionalArgs && command.positionalArgs.length > 0) {
        print('Usage:');
        const positionalArgsUsage = command.positionalArgs
          .map((arg) => (arg.required ? `<${arg.name}>` : `[${arg.name}]`))
          .join(' ');

        print(`  ${command.name} ${positionalArgsUsage}`);
        print('\nPositional Arguments:');
        const longestName = command.positionalArgs.reduce(
          (acc, arg) => Math.max(acc, arg.name.length),
          0
        );
        command.positionalArgs.forEach((arg) =>
          print(
            `  ${arg.required ? '<' : '['}${arg.name.padEnd(longestName)}${
              arg.required ? '>' : ']'
            } | ${arg.description}`
          )
        );
        print('');
      }

      if (command.subcommands && command.subcommands.length > 0) {
        print('Subcommands:');
        const longestName = command.subcommands.reduce(
          (acc, cmd) => Math.max(acc, cmd.name.length),
          0
        );
        command.subcommands.forEach((subcommand) =>
          print(`  ${subcommand.name.padEnd(longestName)} | ${subcommand.description}`)
        );
      }
    }
  } else {
    print('\nAvailable Commands:');
    const longestName = commands.reduce((acc, cmd) => Math.max(acc, cmd.name.length), 0);
    commands.forEach((cmd) => print(`  ${cmd.name.padEnd(longestName)} | ${cmd.description}`));
  }
}

export function executeCommand(args: ParsedArgs, commands: Command[]): void {
  const commandName = args._.shift() || 'help';
  const command = commands.find((cmd) => cmd.name === commandName);

  if (!command) {
    printHelp(commandName, commands);
    return;
  }

  if (command.subcommands && command.subcommands.length > 0 && args._.length > 0) {
    // If there are subcommands and more arguments, execute the subcommand
    executeCommand(args, command.subcommands);
  } else {
    // Otherwise, execute the current command
    command.action ? command.action(args) : printHelp(commandName, commands);
  }
}

// Example usage:
