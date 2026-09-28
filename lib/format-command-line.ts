import {
  booleanFlagNames,
  defaultDebugOptions,
  defaultOptimizationOptions
} from "./options.ts";
import type {
  TCcAction,
  TCcDependencyInfoOptions,
  TCcOptions
} from "./options.ts";

type TFormatter = ({ options }: { options: TCcOptions }) => readonly string[];

const actionArgs: { readonly [action in TCcAction]: readonly string[] } = {
  link: [],
  compile: ["-c"],
  preprocess: ["-E"],
};

const formatLevelOrEnableOption = ({
  option,
  enable,
  level
}: {
  option: string;
  enable: boolean | undefined;
  level: number | undefined;
}) => {
  return [
    ...(enable ? [option] : []),
    ...(level === undefined ? [] : [`${option}${level}`]),
  ];
};

const formatDependencyStdoutGeneration = ({
  action,
  includeSystemHeaderFiles
}: {
  action: TCcAction;
  includeSystemHeaderFiles: boolean | undefined;
}) => {
  if (action !== "preprocess") {
    throw Error("non-file dependency info requested but action is not preprocess");
  }

  return includeSystemHeaderFiles ? "-M" : "-MM";
};

const formatDependencyGeneration = ({ action, dependencyInfo }: { action: TCcAction; dependencyInfo: TCcDependencyInfoOptions }) => {
  const { generate, file, includeSystemHeaderFiles } = dependencyInfo;

  if (!generate) {
    return [];
  }

  if (file) {
    return [includeSystemHeaderFiles ? "-MD" : "-MMD"];
  }

  return [formatDependencyStdoutGeneration({ action, includeSystemHeaderFiles })];
};

const formatDependencyTarget = ({ dependencyInfo }: { dependencyInfo: TCcDependencyInfoOptions }) => {
  return dependencyInfo.target === undefined ? [] : ["-MT", dependencyInfo.target];
};

const formatDependencyFilename = ({ dependencyInfo }: { dependencyInfo: TCcDependencyInfoOptions }) => {
  if (dependencyInfo.filename === undefined) {
    return [];
  }

  if (!dependencyInfo.file) {
    throw Error("filename given but file output not enabled");
  }

  return ["-MF", dependencyInfo.filename];
};

const formatAction: TFormatter = ({ options }) => {
  return actionArgs[options.action];
};

const formatTarget: TFormatter = ({ options }) => {
  return options.target ? [`--target=${options.target}`] : [];
};

const formatInputFiles: TFormatter = ({ options }) => {
  return options.inputFiles ?? [];
};

const formatBooleanFlags: TFormatter = ({ options }) => {
  return booleanFlagNames.filter((name) => {
    return options[name];
  }).map((name) => {
    return `-${name}`;
  });
};

const formatStd: TFormatter = ({ options }) => {
  return options.std ? [`-std=${options.std}`] : [];
};

const formatOptimization: TFormatter = ({ options }) => {
  const { enable, level, size } = options.optimization ?? defaultOptimizationOptions;

  return [
    ...formatLevelOrEnableOption({ option: "-O", enable, level }),
    ...(size ? ["-Os"] : []),
  ];
};

const formatDebug: TFormatter = ({ options }) => {
  const { enable, level } = options.debug ?? defaultDebugOptions;

  return formatLevelOrEnableOption({ option: "-g", enable, level });
};

const formatIncludeDirectories: TFormatter = ({ options }) => {
  return (options.includeDirectories ?? []).map((directory) => {
    return `-I${directory}`;
  });
};

const formatIncludeFiles: TFormatter = ({ options }) => {
  return (options.includeFiles ?? []).flatMap((includeFile) => {
    return ["-include", includeFile];
  });
};

const formatLibraryDirectories: TFormatter = ({ options }) => {
  return (options.libraryDirectories ?? []).map((directory) => {
    return `-L${directory}`;
  });
};

const formatDefines: TFormatter = ({ options }) => {
  return Object.entries(options.defines ?? {}).map(([name, value]) => {
    return value === true ? `-D${name}` : `-D${name}=${value}`;
  });
};

const formatUnknownOptions: TFormatter = ({ options }) => {
  return Object.entries(options.unknownOptions ?? {}).map(([option, value]) => {
    return value === "" ? option : `${option}=${value}`;
  });
};

const formatLibraries: TFormatter = ({ options }) => {
  return (options.libraries ?? []).map((name) => {
    return `-l${name}`;
  });
};

const formatDependencyInfo: TFormatter = ({ options }) => {
  const { action, dependencyInfo } = options;

  if (dependencyInfo === undefined) {
    return [];
  }

  return [
    ...formatDependencyGeneration({ action, dependencyInfo }),
    ...formatDependencyTarget({ dependencyInfo }),
    ...formatDependencyFilename({ dependencyInfo }),
    ...(dependencyInfo.includeMissing ? ["-MP"] : []),
  ];
};

const formatOutputFile: TFormatter = ({ options }) => {
  return options.outputFile ? ["-o", options.outputFile] : [];
};

const formatters: readonly TFormatter[] = [
  formatAction,
  formatTarget,
  formatInputFiles,
  formatBooleanFlags,
  formatStd,
  formatOptimization,
  formatDebug,
  formatIncludeDirectories,
  formatIncludeFiles,
  formatLibraryDirectories,
  formatDefines,
  formatUnknownOptions,
  formatLibraries,
  formatDependencyInfo,
  formatOutputFile,
];

const formatCommandLine = ({ options }: { options: TCcOptions }): string[] => {
  return formatters.flatMap((formatter) => {
    return formatter({ options });
  });
};

export {
  formatCommandLine
};
