import {
  booleanFlagNames,
  defaultDebugOptions,
  defaultDependencyInfoOptions,
  defaultOptimizationOptions,
  defaultOptions
} from "./options.ts";
import type {
  TCcAction,
  TCcCodeGenerationOptions,
  TCcDebugOptions,
  TCcDefines,
  TCcDependencyInfoOptions,
  TCcOptimizationOptions,
  TCcOptions,
  TCcWarnOptions
} from "./options.ts";

type TFlagHandler = ({ options }: { options: TCcOptions }) => TCcOptions;
type TValueHandler = ({ options, value }: { options: TCcOptions; value: string }) => TCcOptions;

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

const parseKeyValue = ({ text, description }: { text: string; description: string }): { [key: string]: string | true } => {
  const [key, ...values] = text.split("=");

  if (values.length > 1) {
    throw Error(`invalid ${description} with multiple equals: "${text}"`);
  }

  return {
    [key]: values.length === 0 ? true : values[0]
  };
};

const parseLevelOrNamedOption = ({ value }: { value: string }): { [key: string]: boolean | number } => {
  if (value === "") {
    return { enable: true };
  }

  const level = Number.parseInt(value, 10);

  return Number.isNaN(level) ? { [value]: true } : { level };
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

const addCodeGeneration = ({ options, codeGeneration }: { options: TCcOptions; codeGeneration: TCcCodeGenerationOptions }) => {
  return {
    ...options,
    codeGeneration: {
      ...options.codeGeneration,
      ...codeGeneration
    }
  };
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

const addWarn = ({ options, warn }: { options: TCcOptions; warn: TCcWarnOptions }) => {
  return {
    ...options,
    warn: {
      ...options.warn,
      ...warn
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
  return addDefines({ options, defines: parseKeyValue({ text: value, description: "define" }) });
};

const setOptimization: TValueHandler = ({ options, value }) => {
  const optimization: TCcOptimizationOptions = {
    ...defaultOptimizationOptions,
    ...(value === "s" ? { size: true } : parseLevelOrNamedOption({ value }))
  };

  return { ...options, optimization };
};

const setWarn: TValueHandler = ({ options, value }) => {
  if (value === "") {
    throw Error("-W with arg not supported yet");
  }

  return addWarn({ options, warn: { [value]: true } });
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

// options whose value is appended to them, e.g. "-O2", more specific prefixes first
const prefixHandlers: readonly { prefix: string; handler: TValueHandler }[] = [
  {
    prefix: "-fno-",
    handler: ({ options, value }) => {
      return addCodeGeneration({ options, codeGeneration: { [value]: false } });
    }
  },
  {
    prefix: "-f",
    handler: ({ options, value }) => {
      return addCodeGeneration({ options, codeGeneration: parseKeyValue({ text: value, description: "-f option" }) });
    }
  },
  { prefix: "-I", handler: addIncludeDirectory },
  { prefix: "-L", handler: addLibraryDirectory },
  {
    prefix: "-gno-",
    handler: ({ options, value }) => {
      return addDebug({ options, debug: { [value]: false } });
    }
  },
  {
    prefix: "-g",
    handler: ({ options, value }) => {
      return addDebug({ options, debug: parseLevelOrNamedOption({ value }) });
    }
  },
  { prefix: "-O", handler: setOptimization },
  {
    // ignore for now
    prefix: "-Q",
    handler: ({ options }) => {
      return options;
    }
  },
  { prefix: "-D", handler: addDefine },
  {
    prefix: "-Wno-",
    handler: ({ options, value }) => {
      return addWarn({ options, warn: { [value]: false } });
    }
  },
  { prefix: "-W", handler: setWarn },
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

  return prefixHandler.handler({ options, value: arg.slice(prefixHandler.prefix.length) });
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
