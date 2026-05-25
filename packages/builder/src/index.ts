export type {
    AnalysisFormat,
    BuilderAnalysis,
    BuilderBuildInfo,
    BuilderDependencyInfo,
    BuilderEntrypointAnalysis,
    ExternalModuleMode,
    ExternalModuleRule,
} from "./analysis";
export { formatAnalysisReport } from "./analysis";
export type { CCTSOptions, CompilerOptions } from "./CompilerOptions";
export {
    DEFAULT_IGNORE_AS_ENTRY_POINT,
    getBuiltInModules,
    validateOptions,
} from "./CompilerOptions";
export { CCBundler } from "./bundler";
export { parseCommandLine } from "./cli/parse";
export {
    createConfigFileUpdater,
    locateConfigFile,
    parseConfigFileWithSystem,
} from "./cli/tsconfig";
export { version, versionString } from "./cli/information";
export {
    CCTranspiler,
    TranspilationError,
    transpileProjectFiles,
    type BuilderTranspileResult,
} from "./transpiler";
