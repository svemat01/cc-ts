import kleur from 'kleur';

import type { App } from '../types/apps.js';

export const showHelp = async (apps: Record<string, App>) => {
    const appsHelp = Object.values(apps)
        .map((app) => {
            if (app.cliHelp) {
                return `${app.color?.(app.name) ?? app.name}:
    ${app.cliHelp.join('\n    ')}`;
            }

            return '';
        })
        .join('\n\n');

    console.log(
        `
${kleur.dim('====================')}
${kleur.bold('Usage:')} create-cc-ts [options] [target-dir]
${kleur.bold('Options:')}
    -h, --help      Show this help message 
    -v, --version   Show version number
    --pm            Specify package manager to use
${appsHelp}`.trimEnd()
    );
};
