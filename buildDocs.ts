import { join } from "node:path";
import { Application, type TypeDocOptions } from "typedoc";

type DeepPartial<TObject> = TObject extends object
    ? {
          [P in keyof TObject]?: DeepPartial<TObject[P]>;
      }
    : TObject;

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
    searchInComments: true,
    searchInDocuments: true,
} satisfies DeepPartial<TypeDocOptions & { themeColor: string }>;

const app = await Application.bootstrapWithPlugins(config as any);

const project = await app.convert();

const customCss = /* css */ `
/* Fix for search input */
#tsd-search.has-focus .field input {
    top: 0 !important;
    opacity: 1 !important;
}`;

if (project) {
    const outputDir = "docs";
    await app.generateDocs(project, outputDir);

    // Add custom CSS to the bottom of the output at /assets/style.css
    const styleFile = join(outputDir, "assets", "style.css");
    const content = await Bun.file(styleFile).text();
    await Bun.write(styleFile, content + customCss);
}
