import {
  booleanFlagNames,
  defaultDebugOptions,
  defaultDependencyInfoOptions,
  defaultOptimizationOptions,
  defaultOptions
} from "./options.ts";
import type {
  TCcAction,
  TCcDebugOptions,
  TCcDefines,
  TCcDependencyInfoOptions,
  TCcOptimizationOptions,
  TCcOptions,
  TCcUnknownOptions
} from "./options.ts";

type TFlagHandler = ({ options }: { options: TCcOptions }) => TCcOptions;
type TValueHandler = ({ options, value }: { options: TCcOptions; value: string }) => TCcOptions;
type TPrefixHandler = ({ options, value, arg }: { options: TCcOptions; value: string; arg: string }) => TCcOptions;

type TParseState = {
  options: TCcOptions;
  pendingValueHandler: TValueHandler | undefined;
};

const appendValue = ({ values = [], value }: { values: readonly string[] | undefined; value: string }) => {
  return [...values, value];
};

const appendUniqueValue = ({ values = [], value }: { values: readonly string[] | undefined; value: string }) => {
  if (values.includes(value)) {
    return values;
  }

  return appendValue({ values, value });
};

const parseDefine = ({ define }: { define: string }): TCcDefines => {
  const [name, ...values] = define.split("=");

  if (values.length > 1) {
    throw Error(`invalid define with multiple equals: "${define}"`);
  }

  return {
    [name]: values.length === 0 ? true : values[0]
  };
};

// an empty value enables the option and a number sets its level, anything else has no field of its own
const parseLevelOrEnable = ({ value }: { value: string }) => {
  if (value === "") {
    return { enable: true };
  }

  if (/^[0-9]+$/.test(value)) {
    return { level: Number.parseInt(value, 10) };
  }

  return undefined;
};

const parseOptimization = ({ value }: { value: string }): Partial<TCcOptimizationOptions> | undefined => {
  return value === "s" ? { size: true } : parseLevelOrEnable({ value });
};

const setAction = ({ action }: { action: TCcAction }): TFlagHandler => {
  return ({ options }) => {
    return { ...options, action };
  };
};

const addDependencyInfo = ({
  options,
  dependencyInfo
}: {
  options: TCcOptions;
  dependencyInfo: Partial<TCcDependencyInfoOptions>;
}) => {
  return {
    ...options,
    dependencyInfo: {
      ...defaultDependencyInfoOptions,
      ...options.dependencyInfo,
      ...dependencyInfo
    }
  };
};

const addDefines = ({ options, defines }: { options: TCcOptions; defines: TCcDefines }) => {
  return {
    ...options,
    defines: {
      ...options.defines,
      ...defines
    }
  };
};

// a repeated option moves to the end, so that the last one given still wins when formatted
const addUnknownOption = ({ options, arg }: { options: TCcOptions; arg: string }): TCcOptions => {
  const [option, ...valueParts] = arg.split("=");
  const { [option]: previousValue, ...otherUnknownOptions } = options.unknownOptions ?? {};

  return {
    ...options,
    unknownOptions: {
      ...otherUnknownOptions,
      [option]: valueParts.join("=")
    }
  };
};

const removeUnknownOptimizations = ({ unknownOptions = {} }: { unknownOptions: TCcUnknownOptions | undefined }) => {
  const remainingUnknownOptions = Object.entries(unknownOptions).filter(([option]) => {
    return !option.startsWith("-O");
  });

  return remainingUnknownOptions.length === 0 ? undefined : Object.fromEntries(remainingUnknownOptions);
};

const addDebug = ({ options, debug }: { options: TCcOptions; debug: Partial<TCcDebugOptions> }) => {
  return {
    ...options,
    debug: {
      ...defaultDebugOptions,
      ...options.debug,
      ...debug
    }
  };
};

const addIncludeDirectory: TValueHandler = ({ options, value }) => {
  return {
    ...options,
    includeDirectories: appendUniqueValue({ values: options.includeDirectories, value })
  };
};

const addLibraryDirectory: TValueHandler = ({ options, value }) => {
  return {
    ...options,
    libraryDirectories: appendUniqueValue({ values: options.libraryDirectories, value })
  };
};

const addDefine: TValueHandler = ({ options, value }) => {
  return addDefines({ options, defines: parseDefine({ define: value }) });
};

const setDebug: TPrefixHandler = ({ options, value, arg }) => {
  const debug = parseLevelOrEnable({ value });

  if (debug === undefined) {
    return addUnknownOption({ options, arg });
  }

  return addDebug({ options, debug });
};

// the last optimization given wins, whether it has a field of its own or not
const setOptimization: TPrefixHandler = ({ options, value, arg }) => {
  const optimization = parseOptimization({ value });
  const optionsWithoutOptimization: TCcOptions = {
    ...options,
    optimization: undefined,
    unknownOptions: removeUnknownOptimizations({ unknownOptions: options.unknownOptions })
  };

  if (optimization === undefined) {
    return addUnknownOption({ options: optionsWithoutOptimization, arg });
  }

  return {
    ...optionsWithoutOptimization,
    optimization: { ...defaultOptimizationOptions, ...optimization }
  };
};

const addWarning: TPrefixHandler = ({ options, value, arg }) => {
  if (value === "") {
    throw Error("-W with arg not supported yet");
  }

  return addUnknownOption({ options, arg });
};

const setStd: TValueHandler = ({ options, value }) => {
  if (value === "") {
    throw Error(`empty std given`);
  }

  return { ...options, std: value };
};

const addLibrary: TValueHandler = ({ options, value }) => {
  if (value === "") {
    throw Error(`library name must be given`);
  }

  return { ...options, libraries: appendValue({ values: options.libraries, value }) };
};

const addInputFile: TValueHandler = ({ options, value }) => {
  return { ...options, inputFiles: appendValue({ values: options.inputFiles, value }) };
};

// options that are given as a single argument, e.g. "-c"
const flagHandlers: { readonly [flag: string]: TFlagHandler } = {
  ...Object.fromEntries(booleanFlagNames.map((name) => {
    const handler: TFlagHandler = ({ options }) => {
      return { ...options, [name]: true };
    };

    return [`-${name}`, handler];
  })),

  "-c": setAction({ action: "compile" }),
  "-E": setAction({ action: "preprocess" }),

  // "-M" and "-MM" imply "-E"
  "-M": ({ options }) => {
    return addDependencyInfo({
      options: { ...options, action: "preprocess" },
      dependencyInfo: { generate: true, includeSystemHeaderFiles: true }
    });
  },
  "-MM": ({ options }) => {
    return addDependencyInfo({
      options: { ...options, action: "preprocess" },
      dependencyInfo: { generate: true, includeSystemHeaderFiles: false }
    });
  },
  "-MD": ({ options }) => {
    return addDependencyInfo({ options, dependencyInfo: { generate: true, includeSystemHeaderFiles: true, file: true } });
  },
  "-MMD": ({ options }) => {
    return addDependencyInfo({ options, dependencyInfo: { generate: true, includeSystemHeaderFiles: false, file: true } });
  },
  "-MP": ({ options }) => {
    return addDependencyInfo({ options, dependencyInfo: { includeMissing: true } });
  },
};

// options whose value is given as the next argument, e.g. "-o main.o"
const valueHandlers: { readonly [option: string]: TValueHandler } = {
  "-o": ({ options, value }) => {
    return { ...options, outputFile: value };
  },
  "-I": addIncludeDirectory,
  "-L": addLibraryDirectory,
  "-D": addDefine,
  "-include": ({ options, value }) => {
    return { ...options, includeFiles: appendValue({ values: options.includeFiles, value }) };
  },
  "-MT": ({ options, value }) => {
    return addDependencyInfo({ options, dependencyInfo: { target: value } });
  },
  "-MF": ({ options, value }) => {
    return addDependencyInfo({ options, dependencyInfo: { file: true, filename: value } });
  },
};

// options whose value is appended to them, e.g. "-O2"
const prefixHandlers: readonly { prefix: string; handler: TPrefixHandler }[] = [
  { prefix: "-f", handler: addUnknownOption },
  { prefix: "-I", handler: addIncludeDirectory },
  { prefix: "-L", handler: addLibraryDirectory },
  { prefix: "-g", handler: setDebug },
  { prefix: "-O", handler: setOptimization },
  {
    // ignore for now
    prefix: "-Q",
    handler: ({ options }) => {
      return options;
    }
  },
  { prefix: "-D", handler: addDefine },
  { prefix: "-W", handler: addWarning },
  { prefix: "-std=", handler: setStd },
  { prefix: "-l", handler: addLibrary },
];

const parsePrefixedOption = ({ options, arg }: { options: TCcOptions; arg: string }) => {
  const prefixHandler = prefixHandlers.find(({ prefix }) => {
    return arg.startsWith(prefix);
  });

  if (prefixHandler === undefined) {
    throw Error(`unknown option ${arg}`);
  }

  return prefixHandler.handler({ options, value: arg.slice(prefixHandler.prefix.length), arg });
};

const parseArg = ({ options, arg }: { options: TCcOptions; arg: string }): TParseState => {
  if (Object.hasOwn(flagHandlers, arg)) {
    return { options: flagHandlers[arg]({ options }), pendingValueHandler: undefined };
  }

  if (Object.hasOwn(valueHandlers, arg)) {
    return { options, pendingValueHandler: valueHandlers[arg] };
  }

  if (arg.startsWith("-")) {
    return { options: parsePrefixedOption({ options, arg }), pendingValueHandler: undefined };
  }

  return { options: addInputFile({ options, value: arg }), pendingValueHandler: undefined };
};

const parseCommandLine = ({ args }: { args: readonly string[] }): TCcOptions => {
  const initialState: TParseState = {
    options: defaultOptions,
    pendingValueHandler: undefined
  };

  const finalState = args.reduce((state, arg) => {
    if (state.pendingValueHandler === undefined) {
      return parseArg({ options: state.options, arg });
    }

    return {
      options: state.pendingValueHandler({ options: state.options, value: arg }),
      pendingValueHandler: undefined
    };
  }, initialState);

  return finalState.options;
};

export {
  parseCommandLine
};
