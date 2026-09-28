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

type TCcAction = "link" | "compile" | "preprocess";

type TCcOptimizationOptions = {
  enable?: boolean;
  level?: number;
  size?: boolean;
  [option: string]: boolean | number | undefined;
};

type TCcDebugOptions = {
  enable?: boolean;
  level?: number;
  [option: string]: boolean | number | undefined;
};

type TCcDependencyInfoOptions = {
  generate?: boolean;
  includeSystemHeaderFiles?: boolean;
  file?: boolean;
  filename?: string;
  target?: string;
  includeMissing?: boolean;
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
  target?: string;
  inputFiles?: readonly string[];
  outputFile?: string;
  std?: string;
  optimization?: TCcOptimizationOptions;
  debug?: TCcDebugOptions;
  includeDirectories?: readonly string[];
  includeFiles?: readonly string[];
  libraryDirectories?: readonly string[];
  libraries?: readonly string[];
  defines?: TCcDefines;
  codeGeneration?: TCcCodeGenerationOptions;
  warn?: TCcWarnOptions;
  dependencyInfo?: TCcDependencyInfoOptions;
} & {
  [flag in TCcBooleanFlagName]?: boolean;
};

export {
  booleanFlagNames
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
