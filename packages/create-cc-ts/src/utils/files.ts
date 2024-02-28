import { Stats } from 'node:fs';
import { access, copyFile, readdir, stat } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const mkdirp = async (path: string) => {
    try {
        await mkdir(path, { recursive: true });
    } catch (error: any) {
        if (error.code === 'EEXIST') {
            return;
        }

        throw error;
    }
};

export const safeStat = async (path: string): Promise<Stats | undefined> => {
    try {
        return await stat(path);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return;
        }

        throw error;
    }
};

export const copy = async (
    source: string,
    target: string,
    rename: (basename: string) => string = (basename) => basename
) => {
    const sourceStats = await safeStat(source);

    // Abort if source doesn't exist
    if (!sourceStats) throw new Error(`Source file ${source} doesn't exist`);

    if (sourceStats.isDirectory()) {
        await mkdirp(target);

        const files = await readdir(source);

        await Promise.all(
            files.map((file) =>
                copy(join(source, file), join(target, rename(file)))
            )
        );
    } else {
        await mkdirp(join(target, '..'));

        await copyFile(source, target);
    }
};

export const pathExists = async (path: string) => {
    try {
        await access(path);

        return true;
    } catch {
        return false;
    }
};
