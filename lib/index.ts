import { parseCommandLine } from "./parse-command-line.ts";
import { formatCommandLine } from "./format-command-line.ts";

type TCompilerCommandLineParser = {
  parseCommandLine: typeof parseCommandLine;
  formatCommandLine: typeof formatCommandLine;
};

const createCompilerCommandLineParser = (): TCompilerCommandLineParser => {
  return {
    parseCommandLine,
    formatCommandLine
  };
};

export {
  createCompilerCommandLineParser
};

export type {
  TCompilerCommandLineParser
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
} from "./options.ts";
