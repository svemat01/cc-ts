import * as path from "node:path";
import type * as ts from "typescript";

import type { BuilderGraphSnapshot } from "./analysis";

const normalizeWatchPath = (fileName: string) => path.normalize(fileName);

export const getInvalidatedSourceFiles = (
    graph: BuilderGraphSnapshot,
    changedFiles: Iterable<string>,
    program: ts.Program
): ts.SourceFile[] | undefined => {
    const normalizedChangedFiles = [...new Set([...changedFiles].map(normalizeWatchPath))];
    if (normalizedChangedFiles.length === 0) {
        return undefined;
    }

    const fileToModules = new Map<string, string[]>();
    for (const [moduleName, fileName] of Object.entries(graph.moduleFiles)) {
        const normalizedFileName = normalizeWatchPath(fileName);
        const existing = fileToModules.get(normalizedFileName);
        if (existing) {
            existing.push(moduleName);
        } else {
            fileToModules.set(normalizedFileName, [moduleName]);
        }
    }

    const affectedEntryModules = new Set<string>();
    const entryModules = Object.keys(graph.entryModules);
    for (const changedFileName of normalizedChangedFiles) {
        const changedModules = fileToModules.get(changedFileName);
        if (!changedModules || changedModules.length === 0) {
            return undefined;
        }

        for (const changedModule of changedModules) {
            for (const entryModule of entryModules) {
                if (
                    entryModule === changedModule ||
                    (graph.moduleDependencies[entryModule] ?? []).includes(
                        changedModule
                    )
                ) {
                    affectedEntryModules.add(entryModule);
                }
            }
        }
    }

    if (affectedEntryModules.size === 0) {
        return undefined;
    }

    const sourceFiles = new Map<string, ts.SourceFile>();
    for (const entryModule of affectedEntryModules) {
        const modulesForEntry = new Set([
            entryModule,
            ...(graph.moduleDependencies[entryModule] ?? []),
        ]);

        for (const moduleName of modulesForEntry) {
            const fileName = graph.moduleFiles[moduleName];
            if (!fileName) {
                continue;
            }

            const sourceFile = program.getSourceFile(fileName);
            if (sourceFile) {
                sourceFiles.set(sourceFile.fileName, sourceFile);
            }
        }
    }

    return sourceFiles.size > 0 ? [...sourceFiles.values()] : undefined;
};
