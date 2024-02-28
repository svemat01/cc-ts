import kleur from 'kleur';
import type { ParsedArgs } from '..';
import type { $, Shell, ShellPromise } from 'bun';

export type AppExec = (
    targetDirectory: string,
    arguments_: ParsedArgs
) => Promise<string | undefined>;

export type App = {
    name: string;
    color?: kleur.Color;
    hint?: string;
    cliHelp?: string[];
    exec: AppExec;
};

export type BasicAppVariant = {
    name: string;
    color?: kleur.Color;
    hint?: string;
    actions: AppAction[];
};

export type AppAction =
    | {
          type: 'files';
          /**
           * Path to template files relative to the templates directory
           */
          path: string;
          dependencies?: string[];
          devDependencies?: string[];
      }
    | {
          type: 'command';
          /**
           * Command to run
           * @example 'npm create svelte@next'
           */
          command: () => ShellPromise;
      
          startMsg: string;
          stopMsg: string;
      }
    | {
          type: 'exec';
          /**
           * Function to run
           * @example (targetDirectory, arguments_) => { ... }
           * @param targetDirectory Directory to create the project in
           * @param arguments_ Arguments passed to the CLI
           * @returns A message to display to the user
           */
          exec: AppExec;
      };
