type TCcAction = "link" | "compile" | "preprocess";

type TCcOptimizationOptions = {
  enable: boolean | undefined;
  level: number | undefined;
  size: boolean | undefined;
  [option: string]: boolean | number | undefined;
};

type TCcDebugOptions = {
  enable: boolean | undefined;
  level: number | undefined;
  [option: string]: boolean | number | undefined;
};

type TCcDependencyInfoOptions = {
  generate: boolean | undefined;
  includeSystemHeaderFiles: boolean | undefined;
  file: boolean | undefined;
  filename: string | undefined;
  target: string | undefined;
  includeMissing: boolean | undefined;
};

type TCcDefines = {
  readonly [name: string]: string | true;
};

type TCcCodeGenerationOptions = {
  readonly [option: string]: string | boolean;
};

type TCcWarnOptions = {
  readonly [option: string]: boolean;
};

type TCcOptions = {
  action: TCcAction;
  target: string | undefined;
  inputFiles: readonly string[] | undefined;
  outputFile: string | undefined;
  pthread: boolean | undefined;
  nodefaultlibs: boolean | undefined;
  nostartfiles: boolean | undefined;
  nostdinc: boolean | undefined;
  nolibc: boolean | undefined;
  rdynamic: boolean | undefined;
  static: boolean | undefined;
  std: string | undefined;
  optimization: TCcOptimizationOptions | undefined;
  debug: TCcDebugOptions | undefined;
  includeDirectories: readonly string[] | undefined;
  includeFiles: readonly string[] | undefined;
  libraryDirectories: readonly string[] | undefined;
  libraries: readonly string[] | undefined;
  defines: TCcDefines | undefined;
  codeGeneration: TCcCodeGenerationOptions | undefined;
  warn: TCcWarnOptions | undefined;
  dependencyInfo: TCcDependencyInfoOptions | undefined;
};

// flags that are either given or not, in the order they are formatted
const booleanFlagNames = [
  "pthread",
  "nodefaultlibs",
  "nostartfiles",
  "nostdinc",
  "nolibc",
  "rdynamic",
  "static",
] as const;

type TCcBooleanFlagName = typeof booleanFlagNames[number];

const defaultOptimizationOptions: TCcOptimizationOptions = {
  enable: undefined,
  level: undefined,
  size: undefined,
};

const defaultDebugOptions: TCcDebugOptions = {
  enable: undefined,
  level: undefined,
};

const defaultDependencyInfoOptions: TCcDependencyInfoOptions = {
  generate: undefined,
  includeSystemHeaderFiles: undefined,
  file: undefined,
  filename: undefined,
  target: undefined,
  includeMissing: undefined,
};

// options of an empty command line
const defaultOptions: TCcOptions = {
  action: "link",
  target: undefined,
  inputFiles: undefined,
  outputFile: undefined,
  pthread: undefined,
  nodefaultlibs: undefined,
  nostartfiles: undefined,
  nostdinc: undefined,
  nolibc: undefined,
  rdynamic: undefined,
  static: undefined,
  std: undefined,
  optimization: undefined,
  debug: undefined,
  includeDirectories: undefined,
  includeFiles: undefined,
  libraryDirectories: undefined,
  libraries: undefined,
  defines: undefined,
  codeGeneration: undefined,
  warn: undefined,
  dependencyInfo: undefined,
};

export {
  booleanFlagNames,
  defaultDebugOptions,
  defaultDependencyInfoOptions,
  defaultOptimizationOptions,
  defaultOptions
};

export type {
  TCcAction,
  TCcBooleanFlagName,
  TCcCodeGenerationOptions,
  TCcDebugOptions,
  TCcDefines,
  TCcDependencyInfoOptions,
  TCcOptimizationOptions,
  TCcOptions,
  TCcWarnOptions
};
