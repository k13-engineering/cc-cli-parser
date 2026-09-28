type TCcAction = "link" | "compile" | "preprocess";

type TCcOptimizationOptions = {
  enable: boolean | undefined;
  level: number | undefined;
  size: boolean | undefined;
};

type TCcDebugOptions = {
  enable: boolean | undefined;
  level: number | undefined;
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

// options of families like -f, -W, -O or -g that have no field of their own,
// keyed by the option up to the first "=" and holding the rest (empty without "="),
// e.g. -fvisibility=default -Wall becomes { "-fvisibility": "default", "-Wall": "" }
type TCcUnknownOptions = Record<string, string>;

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
  dependencyInfo: TCcDependencyInfoOptions | undefined;
  unknownOptions: TCcUnknownOptions | undefined;
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
  dependencyInfo: undefined,
  unknownOptions: undefined,
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
  TCcDebugOptions,
  TCcDefines,
  TCcDependencyInfoOptions,
  TCcOptimizationOptions,
  TCcOptions,
  TCcUnknownOptions
};
