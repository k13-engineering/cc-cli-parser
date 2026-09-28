import {
  actionOptions,
  groupDescriptors,
  namedOptimizationLevels,
  namedQueryOptions,
  namedWarnings,
  prefixMapOptions,
  sanitizerOptions,
  simpleQueryOptions
} from "./option-descriptors.ts";
import type {
  TAnyGroupDescriptor,
  TOptionSyntax
} from "./option-descriptors.ts";
import type {
  TCcArchitectureArgument,
  TCcDependencyOptions,
  TCcInput,
  TCcLanguage,
  TCcMacro,
  TCcOptionGroupName,
  TCcOptions,
  TCcParameter,
  TCcQuery,
  TCcSanitizerSetting,
  TCcWarning
} from "./options.ts";

type TFormatter = ({ options }: { options: TCcOptions }) => readonly string[];

type TGroupValues = Readonly<Record<string, unknown>>;

const spell = ({ option, syntax, value }: { option: string; syntax: TOptionSyntax; value: string }) => {
  if (syntax === "separate" || syntax === "separate-or-joined") {
    return [option, value];
  }

  return [`${option}${value}`];
};

const formatToggle = ({ prefix, name, value }: { prefix: string; name: string; value: unknown }) => {
  if (value === true) {
    return [`${prefix}${name}`];
  }

  if (value === false) {
    return [`${prefix}no-${name}`];
  }

  return [];
};

// -W<tool>,<arguments>, unless an argument contains a comma, which needs -X<tool> <argument>
const formatPassThrough = ({ joinedOption, separateOption, args = [] }: {
  joinedOption: string;
  separateOption: string;
  args: readonly string[] | undefined;
}) => {
  if (args.length === 0) {
    return [];
  }

  if (args.some((arg) => {
    return arg.includes(",");
  })) {
    return args.flatMap((arg) => {
      return [separateOption, arg];
    });
  }

  return [`${joinedOption}${args.join(",")}`];
};

const formatChoice = ({ field, choices, value }: {
  field: string;
  choices: readonly { option: string; value: unknown }[];
  value: unknown;
}) => {
  if (value === undefined) {
    return [];
  }

  const choice = choices.find((candidate) => {
    return candidate.value === value;
  });

  if (choice === undefined) {
    throw Error(`unsupported value ${String(value)} for ${field}`);
  }

  return [choice.option];
};

const formatValuedToggle = ({ prefix, name, value }: { prefix: string; name: string; value: unknown }) => {
  if (typeof value === "string") {
    return [`${prefix}${name}=${value}`];
  }

  return formatToggle({ prefix, name, value });
};

const formatFlagsAndChoices = ({ descriptor, values }: { descriptor: TAnyGroupDescriptor; values: TGroupValues }) => {
  return [
    ...Object.entries(descriptor.flags).filter(([field]) => {
      return values[field] === true;
    }).map(([, option]) => {
      return option;
    }),
    ...descriptor.choices.flatMap(({ field, choices }) => {
      return formatChoice({ field, choices, value: values[field] });
    }),
  ];
};

const formatValues = ({ descriptor, values }: { descriptor: TAnyGroupDescriptor; values: TGroupValues }) => {
  return [...descriptor.enums, ...descriptor.strings, ...descriptor.numbers].flatMap(({ field, option, syntax }) => {
    const value = values[field];

    return value === undefined ? [] : spell({ option, syntax, value: String(value) });
  });
};

const formatToggles = ({ descriptor, values }: { descriptor: TAnyGroupDescriptor; values: TGroupValues }) => {
  const { prefix, names } = descriptor.toggles;

  return [
    ...descriptor.valuedToggles.flatMap((entry) => {
      return formatValuedToggle({ prefix: entry.prefix, name: entry.name, value: values[entry.field] });
    }),
    ...Object.entries(names).flatMap(([field, name]) => {
      return formatToggle({ prefix, name, value: values[field] });
    }),
  ];
};

const formatLists = ({ descriptor, values }: { descriptor: TAnyGroupDescriptor; values: TGroupValues }) => {
  return descriptor.lists.flatMap(({ field, option, syntax }) => {
    const fieldValues = values[field] as readonly string[] | undefined ?? [];

    return fieldValues.flatMap((value) => {
      return spell({ option, syntax, value });
    });
  });
};

const formatGroup = ({ options, descriptor }: { options: TCcOptions; descriptor: TAnyGroupDescriptor }) => {
  const values: TGroupValues = options[descriptor.group] ?? {};

  return [
    ...formatFlagsAndChoices({ descriptor, values }),
    ...formatValues({ descriptor, values }),
    ...formatToggles({ descriptor, values }),
    ...formatLists({ descriptor, values }),
  ];
};

const formatAction: TFormatter = ({ options }) => {
  return options.action === "link" ? [] : [actionOptions[options.action]];
};

const formatQuery = ({ query }: { query: TCcQuery }) => {
  if ("name" in query) {
    return `${namedQueryOptions[query.kind]}${query.name}`;
  }

  return simpleQueryOptions[query.kind];
};

const formatQueries: TFormatter = ({ options }) => {
  return (options.queries ?? []).map((query) => {
    return formatQuery({ query });
  });
};

const formatOptimization: TFormatter = ({ options }) => {
  const { optimization } = options;

  if (optimization === undefined) {
    return [];
  }

  return [typeof optimization === "number" ? `-O${optimization}` : namedOptimizationLevels[optimization]];
};

const formatParameters = ({ parameters = [] }: { parameters: readonly TCcParameter[] | undefined }) => {
  return parameters.flatMap(({ name, value }) => {
    return ["--param", `${name}=${value}`];
  });
};

const formatArchitectureArguments = ({
  architectureArguments = []
}: {
  architectureArguments: readonly TCcArchitectureArgument[] | undefined
}) => {
  return architectureArguments.flatMap(({ architecture, argument }) => {
    return [`-Xarch_${architecture}`, argument];
  });
};

const formatDriverExtras: TFormatter = ({ options }) => {
  const { driver = {} } = options;

  return [
    ...formatPassThrough({ joinedOption: "-Wa,", separateOption: "-Xassembler", args: driver.assemblerArguments }),
    ...formatPassThrough({ joinedOption: "-Wp,", separateOption: "-Xpreprocessor", args: driver.preprocessorArguments }),
    ...formatParameters({ parameters: driver.parameters }),
    ...formatArchitectureArguments({ architectureArguments: driver.architectureArguments }),
  ];
};

const formatAppleDeploymentTarget: TFormatter = ({ options }) => {
  const appleDeploymentTarget = options.target?.appleDeploymentTarget;

  if (appleDeploymentTarget === undefined) {
    return [];
  }

  return [`-m${appleDeploymentTarget.platform}-version-min=${appleDeploymentTarget.version}`];
};

const formatDebugLevel: TFormatter = ({ options }) => {
  const level = options.debug?.level;

  return level === undefined ? [] : [`-g${level}`];
};

// consecutive settings of the same kind share one option, e.g. -fsanitize=address,undefined
const groupSettings = ({ settings }: { settings: readonly TCcSanitizerSetting[] }) => {
  return settings.reduce((runs: readonly { enabled: boolean; names: readonly string[] }[], { name, enabled }) => {
    const lastRun = runs.at(-1);

    if (lastRun?.enabled === enabled) {
      return [...runs.slice(0, -1), { enabled, names: [...lastRun.names, name] }];
    }

    return [...runs, { enabled, names: [name] }];
  }, []);
};

const formatSanitizers: TFormatter = ({ options }) => {
  const instrumentation = options.instrumentation ?? {};
  const sanitizerArgs = Object.entries(sanitizerOptions).flatMap(([field, { enabled, disabled }]) => {
    const settings = instrumentation[field as keyof typeof sanitizerOptions] ?? [];

    return groupSettings({ settings }).map((run) => {
      return `${run.enabled ? enabled : disabled}${run.names.join(",")}`;
    });
  });
  const sanitizerCoverage = instrumentation.sanitizerCoverage ?? [];
  const coverageArgs = sanitizerCoverage.length === 0 ? [] : [
    `-fsanitize-coverage=${sanitizerCoverage.join(",")}`,
  ];

  return [...sanitizerArgs, ...coverageArgs];
};

const formatWarning = ({ name, warning }: { name: string; warning: TCcWarning }) => {
  const { enabled, error, value } = warning;
  const enabledArgs = enabled === true && value !== undefined
    ? [`-W${name}=${value}`]
    : formatToggle({ prefix: "-W", name, value: enabled });

  return [
    ...enabledArgs,
    ...formatToggle({ prefix: "-W", name: `error=${name}`, value: error }),
  ];
};

const formatNamedWarnings: TFormatter = ({ options }) => {
  const values: TGroupValues = options.warnings ?? {};

  return Object.entries(namedWarnings).flatMap(([field, name]) => {
    const warning = values[field] as TCcWarning | undefined;

    return warning === undefined ? [] : formatWarning({ name, warning });
  });
};

const formatMacro = ({ macro }: { macro: TCcMacro }) => {
  if (macro.kind === "undefine") {
    return `-U${macro.name}`;
  }

  return macro.value === undefined ? `-D${macro.name}` : `-D${macro.name}=${macro.value}`;
};

const formatMacros: TFormatter = ({ options }) => {
  return (options.preprocessor?.macros ?? []).map((macro) => {
    return formatMacro({ macro });
  });
};

const formatDependencyStdoutGeneration = ({ action, includeSystemHeaderFiles }: {
  action: TCcOptions["action"];
  includeSystemHeaderFiles: boolean | undefined;
}) => {
  if (action !== "preprocess") {
    throw Error("non-file dependency info requested but action is not preprocess");
  }

  return includeSystemHeaderFiles ? "-M" : "-MM";
};

const formatDependencyGeneration = ({ action, dependencies }: { action: TCcOptions["action"]; dependencies: TCcDependencyOptions }) => {
  const { generate, file, includeSystemHeaderFiles } = dependencies;

  if (!generate) {
    return [];
  }

  if (file) {
    return [includeSystemHeaderFiles ? "-MD" : "-MMD"];
  }

  return [formatDependencyStdoutGeneration({ action, includeSystemHeaderFiles })];
};

const formatDependencyFilename = ({ dependencies }: { dependencies: TCcDependencyOptions }) => {
  if (dependencies.filename === undefined) {
    return [];
  }

  if (!dependencies.file) {
    throw Error("filename given but file output not enabled");
  }

  return ["-MF", dependencies.filename];
};

const formatDependencies: TFormatter = ({ options }) => {
  const { action, dependencies = {} } = options;

  return [
    ...formatDependencyGeneration({ action, dependencies }),
    ...(dependencies.targets ?? []).flatMap(({ name, quoted }) => {
      return [quoted ? "-MQ" : "-MT", name];
    }),
    ...formatDependencyFilename({ dependencies }),
  ];
};

const formatPrefixMaps: TFormatter = ({ options }) => {
  return (options.prefixMaps ?? []).map(({ kind, from, to }) => {
    return `${prefixMapOptions[kind]}${from}=${to}`;
  });
};

const formatUnknownOptions: TFormatter = ({ options }) => {
  return Object.entries(options.unknownOptions ?? {}).map(([option, value]) => {
    return value === "" ? option : `${option}=${value}`;
  });
};

const formatLanguageChange = ({ language, previousLanguage }: {
  language: TCcLanguage | undefined;
  previousLanguage: TCcLanguage | undefined;
}) => {
  if (language === previousLanguage) {
    return [];
  }

  return ["-x", language ?? "none"];
};

const frameworkOption = ({ weak }: { weak: boolean }) => {
  return weak ? "-weak_framework" : "-framework";
};

const formatInput = ({ input }: { input: Exclude<TCcInput, { kind: "file" }> }) => {
  switch (input.kind) {
    case "library": {
      return [`-l${input.name}`];
    }
    case "framework": {
      return [frameworkOption({ weak: input.weak }), input.name];
    }
    case "linker-arguments": {
      return formatPassThrough({ joinedOption: "-Wl,", separateOption: "-Xlinker", args: input.args });
    }
    default: {
      return [`@${input.path}`];
    }
  }
};

// input files are preceded by -x whenever their language differs from the one of the file before
const formatInputs: TFormatter = ({ options }) => {
  const initialState: { args: readonly string[]; language: TCcLanguage | undefined } = { args: [], language: undefined };

  return (options.inputs ?? []).reduce((state, input) => {
    if (input.kind !== "file") {
      return { ...state, args: [...state.args, ...formatInput({ input })] };
    }

    const languageArgs = formatLanguageChange({ language: input.language, previousLanguage: state.language });

    return { args: [...state.args, ...languageArgs, input.path], language: input.language };
  }, initialState).args;
};

const formatOutputFile: TFormatter = ({ options }) => {
  return options.outputFile === undefined ? [] : ["-o", options.outputFile];
};

// formatters of fields that the group descriptors leave out
const groupExtras: { readonly [group in TCcOptionGroupName]: readonly TFormatter[] } = {
  driver: [formatDriverExtras],
  target: [formatAppleDeploymentTarget],
  language: [],
  machine: [],
  preprocessor: [formatMacros],
  dependencies: [formatDependencies],
  debug: [formatDebugLevel],
  codeGeneration: [],
  instrumentation: [formatSanitizers],
  diagnostics: [],
  warnings: [formatNamedWarnings],
  linker: [],
};

const formatters: readonly TFormatter[] = [
  formatAction,
  formatQueries,
  formatOptimization,
  ...groupDescriptors.flatMap((descriptor) => {
    const formatDescribedFields: TFormatter = ({ options }) => {
      return formatGroup({ options, descriptor });
    };

    return [formatDescribedFields, ...groupExtras[descriptor.group]];
  }),
  formatPrefixMaps,
  formatUnknownOptions,
  formatInputs,
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
