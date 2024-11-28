/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["libraries/*", "packages/*"],
    name: "CC TS",
    entryPointStrategy: "packages",
    includeVersion: false,

    packageOptions: {
        includeVersion: true,
        entryPoints: ["src/"],
    },

    plugin: ["typedoc-material-theme"],
    navigation: {
        excludeReferences: true,
    },
};

export default config;
