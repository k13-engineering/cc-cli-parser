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
  TCcAppleDeploymentTarget,
  TCcApplePlatform,
  TCcArchitectureArgument,
  TCcCodeGenerationOptions,
  TCcDebugOptions,
  TCcDependencyOptions,
  TCcDependencyTarget,
  TCcDiagnosticsOptions,
  TCcDriverOptions,
  TCcInput,
  TCcInstrumentationOptions,
  TCcLanguage,
  TCcLanguageOptions,
  TCcLinkerOptions,
  TCcMachineOptions,
  TCcMacro,
  TCcNamedQueryKind,
  TCcOptimizationLevel,
  TCcOptionGroupName,
  TCcOptions,
  TCcParameter,
  TCcPrefixMap,
  TCcPrefixMapKind,
  TCcPreprocessorOptions,
  TCcQuery,
  TCcSanitizerSetting,
  TCcSimpleQueryKind,
  TCcTargetOptions,
  TCcUnknownOptions,
  TCcWarning,
  TCcWarningOptions
} from "./options.ts";
