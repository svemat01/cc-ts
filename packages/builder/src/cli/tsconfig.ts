import * as path from "path";
import ts from "typescript";
import type { CCTSOptions, CompilerOptions } from "../CompilerOptions";
import { updateParsedConfigFile, type ParsedCommandLine } from "./parse";
import { locateConfigFile } from "@cc-ts/typescript-to-lua/dist/cli/tsconfig";

import * as tstlTsconfig from "@cc-ts/typescript-to-lua/dist/cli/tsconfig";

export { locateConfigFile };

export function parseConfigFileWithSystem(
    configFileName: string,
    commandLineOptions?: CompilerOptions,
    system = ts.sys
): ParsedCommandLine {
    const parsedTstlConfigFile = tstlTsconfig.parseConfigFileWithSystem(
        configFileName,
        commandLineOptions,
        system
    );

    const configRootDir = path.dirname(configFileName);
    const cycleCache = new Set<string>();
    const extendedTstlOptions = getExtendedCCtsOptions(
        configFileName,
        configRootDir,
        cycleCache,
        system
    );

    parsedTstlConfigFile.raw["cc-ts"] = Object.assign(
        extendedTstlOptions,
        parsedTstlConfigFile.raw["cc-ts"] ?? {}
    );

    return updateParsedConfigFile(parsedTstlConfigFile);
}

function resolveNpmModuleConfig(
    moduleName: string,
    configRootDir: string,
    host: ts.ModuleResolutionHost
): string | undefined {
    const resolved = ts.nodeNextJsonConfigResolver(
        moduleName,
        path.join(configRootDir, "tsconfig.json"),
        host
    );
    if (resolved.resolvedModule) {
        return resolved.resolvedModule.resolvedFileName;
    }
}

function getExtendedCCtsOptions(
    configFilePath: string,
    configRootDir: string,
    cycleCache: Set<string>,
    system: ts.System
): CCTSOptions {
    const absolutePath = ts.pathIsAbsolute(configFilePath)
        ? configFilePath
        : ts.pathIsRelative(configFilePath)
        ? path.resolve(configRootDir, configFilePath)
        : resolveNpmModuleConfig(configFilePath, configRootDir, system); // if a path is neither relative nor absolute, it is probably a npm module

    if (!absolutePath) {
        return {};
    }

    const newConfigRoot = path.dirname(absolutePath);

    if (cycleCache.has(absolutePath)) {
        return {};
    }

    cycleCache.add(absolutePath);
    const fileContent = system.readFile(absolutePath);
    const options = {};

    if (fileContent) {
        const { config: parsedConfig } = ts.parseConfigFileTextToJson(
            configFilePath,
            fileContent
        ) as {
            config?: {
                extends?: string | string[];
                ccts?: CCTSOptions;
            };
        };

        if (!parsedConfig) {
            return {};
        }

        if (parsedConfig.extends) {
            if (Array.isArray(parsedConfig.extends)) {
                for (const extendedConfigFile of parsedConfig.extends) {
                    Object.assign(
                        options,
                        getExtendedCCtsOptions(
                            extendedConfigFile,
                            newConfigRoot,
                            cycleCache,
                            system
                        )
                    );
                }
            } else {
                Object.assign(
                    options,
                    getExtendedCCtsOptions(
                        parsedConfig.extends,
                        newConfigRoot,
                        cycleCache,
                        system
                    )
                );
            }
        }

        if (parsedConfig.ccts) {
            Object.assign(options, parsedConfig.ccts);
        }
    }

    return options;
}

export function createConfigFileUpdater(
    optionsToExtend: CompilerOptions
): (options: ts.CompilerOptions) => ts.Diagnostic[] {
    const configFileMap = new WeakMap<
        ts.TsConfigSourceFile,
        ts.ParsedCommandLine
    >();
    return (options) => {
        const { configFile, configFilePath } = options;
        if (!configFile || !configFilePath) return [];

        if (!configFileMap.has(configFile)) {
            const parsedConfigFile = parseConfigFileWithSystem(
                configFilePath,
                optionsToExtend,
                ts.sys
            );
            configFileMap.set(configFile, parsedConfigFile);
        }

        const parsedConfigFile = configFileMap.get(configFile)!;
        Object.assign(options, parsedConfigFile.options);
        return parsedConfigFile.errors;
    };
}
