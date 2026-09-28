import { parseCommandLine } from "./parse-command-line.ts";
import { formatCommandLine } from "./format-command-line.ts";

export {
  parseCommandLine,
  formatCommandLine
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
