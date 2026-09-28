import { parse } from "./parse.ts";
import { format } from "./format.ts";

export {
  parse,
  format
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
