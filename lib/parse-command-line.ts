import { defaultOptions } from "./options.ts";
import {
  actionOptions,
  applePlatforms,
  groupDescriptors,
  languages,
  namedOptimizationLevels,
  namedQueryOptions,
  namedWarnings,
  prefixMapOptions,
  sanitizerOptions,
  simpleQueryOptions
} from "./option-descriptors.ts";
import type {
  TAnyGroupDescriptor,
  TOptionSpelling,
  TOptionSyntax
} from "./option-descriptors.ts";
import type {
  TCcAction,
  TCcApplePlatform,
  TCcDebugOptions,
  TCcInput,
  TCcLanguage,
  TCcMacro,
  TCcNamedQueryKind,
  TCcOptimizationLevel,
  TCcOptionGroupName,
  TCcOptions,
  TCcPrefixMapKind,
  TCcQuery,
  TCcSimpleQueryKind,
  TCcWarning
} from "./options.ts";

type TPendingOption = {
  option: string;
  handler: TValueHandler;
};

type TParseState = {
  options: TCcOptions;
  // the language of the last -x, applying to the input files following it
  language: TCcLanguage | undefined;
  // the option waiting for its value in the next argument
  pending: TPendingOption | undefined;
};

type TFlagHandler = ({ state }: { state: TParseState }) => TParseState;

// value is the text after a joined option or the next argument, arg the whole argument of a joined option
type TValueHandler = ({ state, value, arg }: { state: TParseState; value: string; arg: string }) => TParseState;

type TOptionSpec =
  | { option: string; syntax: "flag"; handler: TFlagHandler }
  | { option: string; syntax: TOptionSyntax; handler: TValueHandler };

const withOptions = ({ state, options }: { state: TParseState; options: TCcOptions }): TParseState => {
  return { ...state, options };
};

const updateGroup = <TGroupName extends TCcOptionGroupName>({
  state,
  group,
  values
}: {
  state: TParseState;
  group: TGroupName;
  values: Partial<TCcOptions[TGroupName]>;
}): TParseState => {
  const { options } = state;

  return withOptions({ state, options: { ...options, [group]: { ...options[group], ...values } } });
};

// descriptors name fields as strings, their types guarantee that the fields exist and fit the values
const setField = ({ state, group, field, value }: { state: TParseState; group: TCcOptionGroupName; field: string; value: unknown }) => {
  return updateGroup({ state, group, values: { [field]: value } as Partial<TCcOptions[TCcOptionGroupName]> });
};

const readField = ({ state, group, field }: { state: TParseState; group: TCcOptionGroupName; field: string }) => {
  const values: Readonly<Record<string, unknown>> = state.options[group] ?? {};

  return values[field];
};

const appendToField = ({
  state,
  group,
  field,
  values
}: {
  state: TParseState;
  group: TCcOptionGroupName;
  field: string;
  values: readonly unknown[];
}) => {
  const previousValues = readField({ state, group, field }) as readonly unknown[] | undefined ?? [];

  return setField({ state, group, field, value: [...previousValues, ...values] });
};

const setter = ({ group, field, value }: { group: TCcOptionGroupName; field: string; value: unknown }): TFlagHandler => {
  return ({ state }) => {
    return setField({ state, group, field, value });
  };
};

const requireValue = ({ option, value }: { option: string; value: string }) => {
  if (value === "") {
    throw Error(`missing value for option ${option}`);
  }

  return value;
};

const invalidValue = ({ option, value }: { option: string; value: string }) => {
  return Error(`invalid value "${value}" for option ${option}`);
};

const isNumber = ({ value }: { value: string }) => {
  return /^[0-9]+$/.test(value);
};

const parseNumber = ({ option, value }: { option: string; value: string }) => {
  if (!isNumber({ value })) {
    throw invalidValue({ option, value });
  }

  return Number.parseInt(value, 10);
};

const parseOneOf = ({ option, value, values }: { option: string; value: string; values: readonly string[] }) => {
  if (!values.includes(value)) {
    throw invalidValue({ option, value });
  }

  return value;
};

// splits <left>=<right> at the first "="
const splitAssignment = ({ option, value }: { option: string; value: string }) => {
  const separatorIndex = value.indexOf("=");

  if (separatorIndex < 0) {
    throw invalidValue({ option, value });
  }

  return { left: value.slice(0, separatorIndex), right: value.slice(separatorIndex + 1) };
};

// the names of warnings belong to the key, so that e.g. -Werror=a -Werror=b are both kept
const unknownOptionEntry = ({ arg }: { arg: string }) => {
  if (arg.startsWith("-Werror=") || arg.startsWith("-Wno-error=")) {
    return { key: arg, value: "" };
  }

  const [key, ...valueParts] = arg.split("=");

  return { key, value: valueParts.join("=") };
};

// a repeated option moves to the end, so that the last one given still wins when formatted
const addUnknownOption = ({ state, arg }: { state: TParseState; arg: string }) => {
  const { key, value } = unknownOptionEntry({ arg });
  const { [key]: previousValue, ...otherUnknownOptions } = state.options.unknownOptions ?? {};

  return withOptions({ state, options: { ...state.options, unknownOptions: { ...otherUnknownOptions, [key]: value } } });
};

const flag = ({ option, handler }: { option: string; handler: TFlagHandler }): TOptionSpec => {
  return { option, syntax: "flag", handler };
};

const withSpellings = ({
  spelling,
  aliases,
  handler
}: {
  spelling: TOptionSpelling;
  aliases: readonly TOptionSpelling[];
  handler: TValueHandler;
}): readonly TOptionSpec[] => {
  return [spelling, ...aliases].map(({ option, syntax }) => {
    return { option, syntax, handler };
  });
};

const flagSpecs = ({ descriptor }: { descriptor: TAnyGroupDescriptor }) => {
  const { group, toggles } = descriptor;

  return [
    ...Object.entries(descriptor.flags).map(([field, option]) => {
      return flag({ option, handler: setter({ group, field, value: true }) });
    }),
    ...Object.entries(toggles.names).flatMap(([field, name]) => {
      return [
        flag({ option: `${toggles.prefix}${name}`, handler: setter({ group, field, value: true }) }),
        flag({ option: `${toggles.prefix}no-${name}`, handler: setter({ group, field, value: false }) }),
      ];
    }),
    ...descriptor.choices.flatMap(({ field, choices }) => {
      return choices.map(({ option, value }) => {
        return flag({ option, handler: setter({ group, field, value }) });
      });
    }),
  ];
};

const enumSpecs = ({ descriptor }: { descriptor: TAnyGroupDescriptor }) => {
  const { group } = descriptor;

  return descriptor.enums.flatMap((entry) => {
    const { field, option, values, bareValue } = entry;
    const bareSpecs = bareValue === undefined ? [] : [
      flag({ option: option.slice(0, -"=".length), handler: setter({ group, field, value: bareValue }) }),
    ];

    return [
      ...withSpellings({
        spelling: entry,
        aliases: entry.aliases,
        handler: ({ state, value }) => {
          return setField({ state, group, field, value: parseOneOf({ option, value, values }) });
        },
      }),
      ...bareSpecs,
    ];
  });
};

const valueSpecs = ({ descriptor }: { descriptor: TAnyGroupDescriptor }) => {
  const { group } = descriptor;

  return [
    ...descriptor.strings.flatMap((entry) => {
      return withSpellings({
        spelling: entry,
        aliases: entry.aliases,
        handler: ({ state, value }) => {
          return setField({ state, group, field: entry.field, value: requireValue({ option: entry.option, value }) });
        },
      });
    }),
    ...descriptor.numbers.flatMap((entry) => {
      return withSpellings({
        spelling: entry,
        aliases: entry.aliases,
        handler: ({ state, value }) => {
          return setField({ state, group, field: entry.field, value: parseNumber({ option: entry.option, value }) });
        },
      });
    }),
    ...descriptor.lists.flatMap((entry) => {
      return withSpellings({
        spelling: entry,
        aliases: entry.aliases,
        handler: ({ state, value }) => {
          return appendToField({ state, group, field: entry.field, values: [requireValue({ option: entry.option, value })] });
        },
      });
    }),
  ];
};

const valuedToggleSpecs = ({ descriptor }: { descriptor: TAnyGroupDescriptor }): readonly TOptionSpec[] => {
  const { group } = descriptor;

  return descriptor.valuedToggles.flatMap(({ field, prefix, name, values, aliases }) => {
    const option = `${prefix}${name}=`;

    return [
      flag({ option: `${prefix}${name}`, handler: setter({ group, field, value: true }) }),
      flag({ option: `${prefix}no-${name}`, handler: setter({ group, field, value: false }) }),
      {
        option,
        syntax: "joined",
        handler: ({ state, value }) => {
          const toggleValue = values === undefined ? requireValue({ option, value }) : parseOneOf({ option, value, values });

          return setField({ state, group, field, value: toggleValue });
        },
      },
      ...aliases.map((alias) => {
        return flag({ option: alias.option, handler: setter({ group, field, value: alias.value }) });
      }),
    ];
  });
};

const groupSpecs = groupDescriptors.flatMap((descriptor) => {
  return [
    ...flagSpecs({ descriptor }),
    ...enumSpecs({ descriptor }),
    ...valueSpecs({ descriptor }),
    ...valuedToggleSpecs({ descriptor }),
  ];
});

const actionStages: readonly string[] = [...Object.keys(actionOptions), "link"];

const withAction = ({ state, action }: { state: TParseState; action: TCcAction }) => {
  const { options } = state;
  const earliestAction = actionStages.indexOf(action) < actionStages.indexOf(options.action) ? action : options.action;

  return withOptions({ state, options: { ...options, action: earliestAction } });
};

const actionSpecs = Object.entries(actionOptions).map(([action, option]) => {
  return flag({
    option,
    handler: ({ state }) => {
      return withAction({ state, action: action as TCcAction });
    },
  });
});

const addInput = ({ state, input }: { state: TParseState; input: TCcInput }) => {
  return withOptions({ state, options: { ...state.options, inputs: [...state.options.inputs ?? [], input] } });
};

const setLanguage: TValueHandler = ({ state, value }) => {
  if (value === "none") {
    return { ...state, language: undefined };
  }

  if (!Object.hasOwn(languages, value)) {
    throw invalidValue({ option: "-x", value });
  }

  return { ...state, language: value as TCcLanguage };
};

const addFramework = ({ weak }: { weak: boolean }): TValueHandler => {
  return ({ state, value }) => {
    return addInput({ state, input: { kind: "framework", name: requireValue({ option: "-framework", value }), weak } });
  };
};

const inputSpecs: readonly TOptionSpec[] = [
  {
    option: "-o",
    syntax: "separate-or-joined",
    handler: ({ state, value }) => {
      return withOptions({ state, options: { ...state.options, outputFile: requireValue({ option: "-o", value }) } });
    },
  },
  { option: "-x", syntax: "separate-or-joined", handler: setLanguage },
  {
    option: "-l",
    syntax: "joined-or-separate",
    handler: ({ state, value }) => {
      return addInput({ state, input: { kind: "library", name: requireValue({ option: "-l", value }) } });
    },
  },
  { option: "-framework", syntax: "separate", handler: addFramework({ weak: false }) },
  { option: "-weak_framework", syntax: "separate", handler: addFramework({ weak: true }) },
  {
    option: "-Wl,",
    syntax: "joined",
    handler: ({ state, value }) => {
      return addInput({ state, input: { kind: "linker-arguments", args: value.split(",") } });
    },
  },
  {
    option: "-Xlinker",
    syntax: "separate",
    handler: ({ state, value }) => {
      return addInput({ state, input: { kind: "linker-arguments", args: [value] } });
    },
  },
];

const addQuery = ({ state, query }: { state: TParseState; query: TCcQuery }) => {
  return withOptions({ state, options: { ...state.options, queries: [...state.options.queries ?? [], query] } });
};

const querySpecs: readonly TOptionSpec[] = [
  ...Object.entries(simpleQueryOptions).map(([kind, option]) => {
    return flag({
      option,
      handler: ({ state }) => {
        return addQuery({ state, query: { kind: kind as TCcSimpleQueryKind } });
      },
    });
  }),
  ...Object.entries(namedQueryOptions).map(([kind, option]): TOptionSpec => {
    return {
      option,
      syntax: "joined",
      handler: ({ state, value }) => {
        return addQuery({ state, query: { kind: kind as TCcNamedQueryKind, name: requireValue({ option, value }) } });
      },
    };
  }),
];

const setOptimization = ({ state, optimization }: { state: TParseState; optimization: TCcOptimizationLevel }) => {
  return withOptions({ state, options: { ...state.options, optimization } });
};

const optimizationSpecs: readonly TOptionSpec[] = [
  ...Object.entries(namedOptimizationLevels).map(([level, option]) => {
    return flag({
      option,
      handler: ({ state }) => {
        return setOptimization({ state, optimization: level as TCcOptimizationLevel });
      },
    });
  }),
  {
    option: "-O",
    syntax: "joined",
    handler: ({ state, value }) => {
      return setOptimization({ state, optimization: parseNumber({ option: "-O", value }) });
    },
  },
];

const prefixMapSpecs = Object.entries(prefixMapOptions).map(([kind, option]): TOptionSpec => {
  return {
    option,
    syntax: "joined",
    handler: ({ state, value }) => {
      const { left, right } = splitAssignment({ option, value });
      const prefixMap = { kind: kind as TCcPrefixMapKind, from: left, to: right };

      return withOptions({ state, options: { ...state.options, prefixMaps: [...state.options.prefixMaps ?? [], prefixMap] } });
    },
  };
});

const parseDefinition = ({ definition }: { definition: string }): TCcMacro => {
  const separatorIndex = definition.indexOf("=");

  if (separatorIndex < 0) {
    return { kind: "define", name: definition };
  }

  return { kind: "define", name: definition.slice(0, separatorIndex), value: definition.slice(separatorIndex + 1) };
};

const addMacro = ({ state, macro }: { state: TParseState; macro: TCcMacro }) => {
  return appendToField({ state, group: "preprocessor", field: "macros", values: [macro] });
};

const macroSpecs: readonly TOptionSpec[] = [
  {
    option: "-D",
    syntax: "joined-or-separate",
    handler: ({ state, value }) => {
      return addMacro({ state, macro: parseDefinition({ definition: requireValue({ option: "-D", value }) }) });
    },
  },
  {
    option: "-U",
    syntax: "joined-or-separate",
    handler: ({ state, value }) => {
      return addMacro({ state, macro: { kind: "undefine", name: requireValue({ option: "-U", value }) } });
    },
  },
];

// -W<tool>,<arguments> and -X<tool> <argument> of the assembler and preprocessor
const passThroughSpecs = ({ group, field, joinedOption, separateOption }: {
  group: "driver";
  field: string;
  joinedOption: string;
  separateOption: string;
}): readonly TOptionSpec[] => {
  return [
    {
      option: joinedOption,
      syntax: "joined",
      handler: ({ state, value }) => {
        return appendToField({ state, group, field, values: value.split(",") });
      },
    },
    {
      option: separateOption,
      syntax: "separate",
      handler: ({ state, value }) => {
        return appendToField({ state, group, field, values: [value] });
      },
    },
  ];
};

const addParameter: TValueHandler = ({ state, value }) => {
  const { left, right } = splitAssignment({ option: "--param", value });

  return appendToField({ state, group: "driver", field: "parameters", values: [{ name: left, value: right }] });
};

const addArchitectureArgument = ({ architecture }: { architecture: string }): TValueHandler => {
  return ({ state, value }) => {
    return appendToField({ state, group: "driver", field: "architectureArguments", values: [{ architecture, argument: value }] });
  };
};

const driverSpecs: readonly TOptionSpec[] = [
  ...passThroughSpecs({ group: "driver", field: "assemblerArguments", joinedOption: "-Wa,", separateOption: "-Xassembler" }),
  ...passThroughSpecs({ group: "driver", field: "preprocessorArguments", joinedOption: "-Wp,", separateOption: "-Xpreprocessor" }),
  { option: "--param", syntax: "separate", handler: addParameter },
  { option: "--param=", syntax: "joined", handler: addParameter },
  {
    option: "-Xarch_",
    syntax: "joined",
    handler: ({ state, value }) => {
      const architecture = requireValue({ option: "-Xarch_", value });

      return { ...state, pending: { option: `-Xarch_${architecture}`, handler: addArchitectureArgument({ architecture }) } };
    },
  },
  flag({ option: "-integrated-as", handler: setter({ group: "driver", field: "integratedAssembler", value: true }) }),
  flag({ option: "-no-integrated-as", handler: setter({ group: "driver", field: "integratedAssembler", value: false }) }),
];

const appleDeploymentTargetSpecs = Object.keys(applePlatforms).map((platform): TOptionSpec => {
  const option = `-m${platform}-version-min=`;

  return {
    option,
    syntax: "joined",
    handler: ({ state, value }) => {
      const appleDeploymentTarget = { platform: platform as TCcApplePlatform, version: requireValue({ option, value }) };

      return updateGroup({ state, group: "target", values: { appleDeploymentTarget } });
    },
  };
});

const generateDependencies = ({ includeSystemHeaderFiles, file, preprocess }: {
  includeSystemHeaderFiles: boolean;
  file: true | undefined;
  preprocess: boolean;
}): TFlagHandler => {
  return ({ state }) => {
    const stateWithAction = preprocess ? withAction({ state, action: "preprocess" }) : state;
    const fileValues = file === undefined ? {} : { file };

    return updateGroup({
      state: stateWithAction,
      group: "dependencies",
      values: { generate: true, includeSystemHeaderFiles, ...fileValues },
    });
  };
};

const addDependencyTarget = ({ quoted }: { quoted: boolean }): TValueHandler => {
  return ({ state, value }) => {
    return appendToField({ state, group: "dependencies", field: "targets", values: [{ name: value, quoted }] });
  };
};

const dependencySpecs: readonly TOptionSpec[] = [
  flag({ option: "-M", handler: generateDependencies({ includeSystemHeaderFiles: true, file: undefined, preprocess: true }) }),
  flag({ option: "-MM", handler: generateDependencies({ includeSystemHeaderFiles: false, file: undefined, preprocess: true }) }),
  flag({ option: "-MD", handler: generateDependencies({ includeSystemHeaderFiles: true, file: true, preprocess: false }) }),
  flag({ option: "-MMD", handler: generateDependencies({ includeSystemHeaderFiles: false, file: true, preprocess: false }) }),
  {
    option: "-MF",
    syntax: "separate-or-joined",
    handler: ({ state, value }) => {
      return updateGroup({ state, group: "dependencies", values: { file: true, filename: requireValue({ option: "-MF", value }) } });
    },
  },
  { option: "-MT", syntax: "separate-or-joined", handler: addDependencyTarget({ quoted: false }) },
  { option: "-MQ", syntax: "separate-or-joined", handler: addDependencyTarget({ quoted: true }) },
];

// -g<level> and -ggdb<level> and alike, any other -g<something> has no field of its own
const setDebugLevel = ({ format }: { format: TCcDebugOptions["format"] }): TValueHandler => {
  return ({ state, value, arg }) => {
    if (!isNumber({ value })) {
      return addUnknownOption({ state, arg });
    }

    const formatValues = format === undefined ? {} : { format };

    return updateGroup({ state, group: "debug", values: { ...formatValues, level: Number.parseInt(value, 10) } });
  };
};

const debugLevelSpecs: readonly TOptionSpec[] = [
  { option: "-g", syntax: "joined", handler: setDebugLevel({ format: undefined }) },
  { option: "-ggdb", syntax: "joined", handler: setDebugLevel({ format: "gdb" }) },
  { option: "-gstabs", syntax: "joined", handler: setDebugLevel({ format: "stabs" }) },
  { option: "-gxcoff", syntax: "joined", handler: setDebugLevel({ format: "xcoff" }) },
  { option: "-gvms", syntax: "joined", handler: setDebugLevel({ format: "vms" }) },
];

const addSanitizerSettings = ({ state, field, names, enabled }: {
  state: TParseState;
  field: string;
  names: readonly string[];
  enabled: boolean;
}) => {
  const settings = names.map((name) => {
    return { name, enabled };
  });

  return appendToField({ state, group: "instrumentation", field, values: settings });
};

const sanitizerOptionSpecs = ({ field, option, enabled, bare }: {
  field: string;
  option: string;
  enabled: boolean;
  bare: boolean;
}): readonly TOptionSpec[] => {
  const bareSpecs = bare ? [
    flag({
      option: option.slice(0, -"=".length),
      handler: ({ state }) => {
        return addSanitizerSettings({ state, field, names: ["all"], enabled });
      },
    }),
  ] : [];

  return [
    {
      option,
      syntax: "joined",
      handler: ({ state, value }) => {
        return addSanitizerSettings({ state, field, names: requireValue({ option, value }).split(","), enabled });
      },
    },
    ...bareSpecs,
  ];
};

const sanitizerSpecs: readonly TOptionSpec[] = [
  ...Object.entries(sanitizerOptions).flatMap(([field, { enabled, disabled, bare }]) => {
    return [
      ...sanitizerOptionSpecs({ field, option: enabled, enabled: true, bare }),
      ...sanitizerOptionSpecs({ field, option: disabled, enabled: false, bare }),
    ];
  }),
  {
    option: "-fsanitize-coverage=",
    syntax: "joined",
    handler: ({ state, value }) => {
      const types = requireValue({ option: "-fsanitize-coverage=", value }).split(",");

      return appendToField({ state, group: "instrumentation", field: "sanitizerCoverage", values: types });
    },
  },
];

const updateWarning = ({ state, field, change }: { state: TParseState; field: string; change: Partial<TCcWarning> }) => {
  const warning = readField({ state, group: "warnings", field }) as TCcWarning | undefined;
  const updatedWarning: TCcWarning = { ...warning, ...change };

  return setField({ state, group: "warnings", field, value: updatedWarning });
};

const warningChanger = ({ field, change }: { field: string; change: Partial<TCcWarning> }): TFlagHandler => {
  return ({ state }) => {
    return updateWarning({ state, field, change });
  };
};

const warningSpecs: readonly TOptionSpec[] = [
  ...Object.entries(namedWarnings).flatMap(([field, name]): readonly TOptionSpec[] => {
    const valueOption = `-W${name}=`;

    return [
      flag({ option: `-W${name}`, handler: warningChanger({ field, change: { enabled: true } }) }),
      flag({ option: `-Wno-${name}`, handler: warningChanger({ field, change: { enabled: false } }) }),
      flag({ option: `-Werror=${name}`, handler: warningChanger({ field, change: { error: true } }) }),
      flag({ option: `-Wno-error=${name}`, handler: warningChanger({ field, change: { error: false } }) }),
      {
        option: valueOption,
        syntax: "joined",
        handler: ({ state, value }) => {
          return updateWarning({ state, field, change: { enabled: true, value: requireValue({ option: valueOption, value }) } });
        },
      },
    ];
  }),
  flag({ option: "-W", handler: warningChanger({ field: "extra", change: { enabled: true } }) }),
  flag({ option: "-pedantic", handler: warningChanger({ field: "pedantic", change: { enabled: true } }) }),
];

const optionSpecs: readonly TOptionSpec[] = [
  ...groupSpecs,
  ...actionSpecs,
  ...inputSpecs,
  ...querySpecs,
  ...optimizationSpecs,
  ...prefixMapSpecs,
  ...macroSpecs,
  ...driverSpecs,
  ...appleDeploymentTargetSpecs,
  ...dependencySpecs,
  ...debugLevelSpecs,
  ...sanitizerSpecs,
  ...warningSpecs,
];

const awaitValue = ({ option, handler }: { option: string; handler: TValueHandler }): TFlagHandler => {
  return ({ state }) => {
    return { ...state, pending: { option, handler } };
  };
};

// options matching an argument exactly, the ones taking a value wait for the next argument
const exactHandlers: Readonly<Record<string, TFlagHandler>> = Object.fromEntries(optionSpecs.flatMap((spec) => {
  if (spec.syntax === "flag") {
    return [[spec.option, spec.handler]];
  }

  return spec.syntax === "joined" ? [] : [[spec.option, awaitValue({ option: spec.option, handler: spec.handler })]];
}));

// options followed by their value in the same argument, the longest prefix matching wins
const prefixHandlers = optionSpecs.flatMap((spec) => {
  return spec.syntax === "flag" || spec.syntax === "separate" ? [] : [{ prefix: spec.option, handler: spec.handler }];
}).toSorted((left, right) => {
  return right.prefix.length - left.prefix.length;
});

const isOperand = ({ arg }: { arg: string }) => {
  return arg === "-" || !arg.startsWith("-");
};

const parseOperand = ({ state, arg }: { state: TParseState; arg: string }) => {
  if (arg.startsWith("@")) {
    return addInput({ state, input: { kind: "response-file", path: arg.slice("@".length) } });
  }

  const languageValues = state.language === undefined ? {} : { language: state.language };

  return addInput({ state, input: { kind: "file", path: arg, ...languageValues } });
};

const parsePrefixedOption = ({ state, arg }: { state: TParseState; arg: string }) => {
  const prefixHandler = prefixHandlers.find(({ prefix }) => {
    return arg.startsWith(prefix);
  });

  if (prefixHandler === undefined) {
    return addUnknownOption({ state, arg });
  }

  return prefixHandler.handler({ state, value: arg.slice(prefixHandler.prefix.length), arg });
};

const parseArg = ({ state, arg }: { state: TParseState; arg: string }): TParseState => {
  if (state.pending !== undefined) {
    return state.pending.handler({ state: { ...state, pending: undefined }, value: arg, arg: state.pending.option });
  }

  if (isOperand({ arg })) {
    return parseOperand({ state, arg });
  }

  if (Object.hasOwn(exactHandlers, arg)) {
    return exactHandlers[arg]({ state });
  }

  return parsePrefixedOption({ state, arg });
};

const parseCommandLine = ({ args }: { args: readonly string[] }): TCcOptions => {
  const initialState: TParseState = {
    options: defaultOptions,
    language: undefined,
    pending: undefined,
  };

  const finalState = args.reduce((state, arg) => {
    return parseArg({ state, arg });
  }, initialState);

  if (finalState.pending !== undefined) {
    throw Error(`missing value for option ${finalState.pending.option}`);
  }

  return finalState.options;
};

export {
  optionSpecs,
  parseCommandLine
};
