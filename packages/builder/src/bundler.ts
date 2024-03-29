import { log } from "./logger";
import { Glob } from "bun";

import { basename, dirname, isAbsolute, resolve, relative } from "node:path";
import luamin from "luamin";
import { bold } from "kleur/colors";

function formatFileSize(bytes: number): string {
    let size = "Bytes";

    if (bytes > 1024) {
        bytes = bytes / 1024;
        size = "KB";
    }

    if (bytes > 1024) {
        bytes = bytes / 1024;
        size = "MB";
    }

    return `${bytes.toFixed(2)} ${size}`;
}

interface CCBundleConfig {
    entry: string;
    output: string;
}

interface Project {
    config: CCBundleConfig;
    rootDir: string;
    files: Record<string, File>;
}

interface File {
    source: string;
    path: string;
    moduleName: string;
}

const bundleTemplate = (body: string, entryModuleName: string) => `
local ____modules = {}
local ____moduleCache = {}
local ____originalRequire = require
local function require(file, ...)
    if ____moduleCache[file] then
        return ____moduleCache[file].value
    end
    if ____modules[file] then
        local module = ____modules[file]
        if select("#", ...) > 0 then
            ____moduleCache[file] = { value = module(...) }
        else
            ____moduleCache[file] = { value = module(file) }
        end
        return ____moduleCache[file].value
    else
        if ____originalRequire then
            return ____originalRequire(file)
        else
            error("module '" .. file .. "' not found")
        end
    end
end
____modules = {
${body}
}

return require("${entryModuleName}", ...)
`;

const moduleTemplate = (
    name: string,
    content: string
) => `["${name}"] = function(...)
${content}
end,`;

// Function to require a file in the project
async function requireFile(
    project: Project,
    relativeFileName: string
): Promise<File | undefined> {
    const moduleName = relativeFileName.replace(".lua", "");

    // Resolve the absolute path of the file
    const absPath = resolve(
        project.rootDir,
        moduleName.replace(/\.(?!lua|lib)/g, "/") + ".lua"
    );

    // Check if the file is already in the project's files
    if (project.files[moduleName]) {
        return project.files[moduleName];
    }

    const file = Bun.file(absPath);

    // Check if the file exists
    const fileExists = await file.exists();
    if (!fileExists && moduleName.startsWith("cc.")) {
        // Log a warning if the file doesn't exist, aka it's an external module
        log.warn(
            `[${project.config.entry}] File ${relativeFileName} not found, assuming external module`
        );
        return;
    }

    // Create a new File object for the required file
    const fileData: File = {
        source: await file.text(),
        path: absPath,
        moduleName,
    };

    // Expand requires in the file's source code
    await expandRequires(fileData, project);

    // Add the file to the project's files
    project.files[moduleName] = fileData;

    return fileData;
}

// Function to expand requires in a file's source code
async function expandRequires(file: File, project: Project) {
    const regexp = /require\(['"](.*)['"]\)/gim;
    // run requireFile on each match
    for (const match of file.source.matchAll(regexp)) {
        await requireFile(project, match[1]);
    }
}

function combineProjectFiles(project: Project, entryFile: File) {
    const files = Object.values(project.files);
    const combinedModules = files
        .map((file) => moduleTemplate(file.moduleName, file.source))
        .join("\n");

    return bundleTemplate(combinedModules, entryFile.moduleName);
}

export interface BundleProjectOptions {
    /** Root directory, main resolve path */
    rootDir: string;
    /** Entry file relative to root dir */
    entry: string;
    /** Absolute path */
    out: string;
    noEmit: boolean;
    minify?: boolean;
}

export function generateHeader(
    projectOptions: BundleProjectOptions,
    project: Project,
    output: string
) {
    const hash = Bun.hash(output).toString(36);

    const header = `-- Generated by CCBundle v1.0.0
-- HeaderSchema: CCBundle@1.0.0
-- Entry: ${projectOptions.entry}
-- Hash: ${hash}
-- BuildTime: ${new Date().toISOString()}
-- Files: ${Object.keys(project.files).join(", ")}
-- Minified: ${projectOptions.minify}`;

    return header;
}

export async function bundleProject(options: BundleProjectOptions) {
    const { entry, out, noEmit, rootDir, minify = false } = options;

    // Creating project
    const project: Project = {
        config: {
            entry: isAbsolute(entry) ? relative(rootDir, entry) : entry,
            output: out,
        },
        rootDir,
        files: {},
    };

    // Requiring entry file
    const entryFile = await requireFile(
        project,
        project.config.entry.replaceAll("/", ".")
    );

    if (!entryFile) {
        throw new Error(`Entry file not found: ${project.config.entry}`);
    }

    // const bundleSource = project.bundleStream.toString();
    const bundleSource = combineProjectFiles(project, entryFile);

    // Writing bundle to file
    if (!noEmit) {
        let output = bundleSource;

        if (minify) {
            log.debug(
                `[${basename(project.config.output)}] Minifying bundle...`
            );
            output = luamin.minify(bundleSource);
        }
        
        output = generateHeader(options, project, output) + output;

        const fileSize = await Bun.write(project.config.output, output);

        // Bundle size info
        log.debug(
            `${entryFile.moduleName} bundle size: ${bold(
                formatFileSize(fileSize)
            )}`
        );
    }

    return bundleSource;
}

export const bundleProjectFiles = async (config: {
    srcDir: string;
    outDir: string;

    minify: boolean;
    noEmit: boolean;
}) => {
    const glob = new Glob("**/*.lua");
    log.verbose(config);

    for await (const file of glob.scan({
        cwd: config.srcDir,
    })) {
        // Ignore files in a lib folder
        if (file.split("/").includes("lib")) continue;

        // Ignore d.ts files
        if (file.endsWith(".d.lua")) continue;

        // Ignore lib.ts files
        if (file.endsWith(".lib.lua")) continue;

        // Ignore lualib_bundle.lua
        if (file === "lualib_bundle.lua") continue;

        log.verbose(`Bundling file: ${file}`);

        await bundleProject({
            rootDir: config.srcDir,
            entry: file,
            out: resolve(config.outDir, file),
            minify: config.minify,
            noEmit: config.noEmit,
        });
    }
};
