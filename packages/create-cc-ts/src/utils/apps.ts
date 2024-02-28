import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { App } from '../types/apps.js';

export const loadApps = async () => {
    const apps: Record<string, App> = {};
    const foldersPath = new URL('../apps', import.meta.url).pathname;

    const _appFiles = await readdir(foldersPath, {
        withFileTypes: true,
    });

    const appFiles = _appFiles
        .filter((dirent) => dirent.isFile() && /\.(t|j)s$/.test(dirent.name))
        .map((dirent) => dirent.name);

    // for each folder, import the app.ts file
    for (const appFile of appFiles) {
        const { default: app } = await import(
            join(foldersPath, appFile.replace(/\.ts$/, '.js'))
        );

        apps[appFile] = app;
    }

    return apps;
};
