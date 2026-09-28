import type {
  TCcAction,
  TCcApplePlatform,
  TCcCodeGenerationOptions,
  TCcDebugOptions,
  TCcLanguage,
  TCcLanguageOptions,
  TCcLinkerOptions,
  TCcMachineOptions,
  TCcNamedQueryKind,
  TCcOptimizationLevel,
  TCcOptionGroupName,
  TCcOptions,
  TCcPrefixMapKind,
  TCcSimpleQueryKind,
  TCcWarning,
  TCcWarningOptions
} from "./options.ts";

// fields of a group whose values have exactly the given type
type TFieldsOfType<TGroup, TValue> = {
  [field in keyof TGroup]-?: [TGroup[field]] extends [TValue] ? ([TValue] extends [TGroup[field]] ? field : never) : never;
}[keyof TGroup];

// fields holding one of several strings, e.g. "hidden" | "default" | undefined
type TEnumFields<TGroup> = {
  [field in keyof TGroup]-?: [TGroup[field]] extends [string | undefined]
    ? (string extends NonNullable<TGroup[field]> ? never : field)
    : never;
}[keyof TGroup];

// fields that are switched on, off or set to a value, e.g. boolean | string | undefined
type TValuedToggleFields<TGroup> = {
  [field in keyof TGroup]-?: [TGroup[field]] extends [boolean | string | undefined]
    ? (boolean extends TGroup[field] ? (NonNullable<TGroup[field]> extends boolean ? never : field) : never)
    : never;
}[keyof TGroup];

// joined: -std=c99, separate: -o file, the first alternative of the others is written
type TOptionSyntax = "joined" | "separate" | "joined-or-separate" | "separate-or-joined";

type TOptionSpelling = {
  option: string;
  syntax: TOptionSyntax;
};

type TValueDescriptor<TField> = TOptionSpelling & {
  field: TField;
  // further spellings that are understood, but not written
  aliases: readonly TOptionSpelling[];
};

type TEnumDescriptor<TGroup> = {
  [field in TEnumFields<TGroup>]: TValueDescriptor<field> & {
    values: readonly NonNullable<TGroup[field]>[];
    // the value of the option given without its "=", e.g. zlib for -gz
    bareValue: NonNullable<TGroup[field]> | undefined;
  };
}[TEnumFields<TGroup>];

type TChoiceDescriptor<TGroup> = {
  [field in keyof TGroup]-?: {
    field: field;
    // options setting the field to a value, the first one of a value is written
    choices: readonly { option: string; value: TGroup[field] }[];
  };
}[keyof TGroup];

// -<prefix><name>, -<prefix>no-<name>, -<prefix><name>=<value>
type TValuedToggleDescriptor<TGroup> = {
  field: TValuedToggleFields<TGroup>;
  prefix: string;
  name: string;
  // the values allowed after "=", any if undefined
  values: readonly string[] | undefined;
  // further options that are understood, but not written
  aliases: readonly { option: string; value: boolean }[];
};

// -<prefix><name>, -<prefix>no-<name>
type TToggleDescriptor<TGroup> = {
  prefix: string;
  names: { readonly [field in TFieldsOfType<TGroup, boolean | undefined>]: string };
};

// the fields of an option group
type TGroupFields<TGroupName extends TCcOptionGroupName> = NonNullable<TCcOptions[TGroupName]>;

// how the fields of an option group are spelled, except for the ones handled on their own
type TGroupDescriptor<TGroupName extends TCcOptionGroupName, TCustomField extends keyof TGroupFields<TGroupName> = never> = {
  group: TGroupName;
  flags: { readonly [field in TFieldsOfType<Omit<TGroupFields<TGroupName>, TCustomField>, true | undefined>]: string };
  toggles: TToggleDescriptor<Omit<TGroupFields<TGroupName>, TCustomField>>;
  choices: readonly TChoiceDescriptor<TGroupFields<TGroupName>>[];
  enums: readonly TEnumDescriptor<TGroupFields<TGroupName>>[];
  strings: readonly TValueDescriptor<TFieldsOfType<TGroupFields<TGroupName>, string | undefined>>[];
  numbers: readonly TValueDescriptor<TFieldsOfType<TGroupFields<TGroupName>, number | undefined>>[];
  lists: readonly TValueDescriptor<TFieldsOfType<TGroupFields<TGroupName>, readonly string[] | undefined>>[];
  valuedToggles: readonly TValuedToggleDescriptor<TGroupFields<TGroupName>>[];
};

// any group descriptor, as the parser and formatter handle them through field names
type TAnyGroupDescriptor = {
  group: TCcOptionGroupName;
  flags: Readonly<Record<string, string>>;
  toggles: { prefix: string; names: Readonly<Record<string, string>> };
  choices: readonly { field: string; choices: readonly { option: string; value: unknown }[] }[];
  enums: readonly (TValueDescriptor<string> & { values: readonly string[]; bareValue: string | undefined })[];
  strings: readonly TValueDescriptor<string>[];
  numbers: readonly TValueDescriptor<string>[];
  lists: readonly TValueDescriptor<string>[];
  valuedToggles: readonly {
    field: string;
    prefix: string;
    name: string;
    values: readonly string[] | undefined;
    aliases: readonly { option: string; value: boolean }[];
  }[];
};

const joined = <TField extends string>({ field, option }: { field: TField; option: string }) => {
  return { field, option, syntax: "joined", aliases: [] } as const;
};

const separate = <TField extends string>({ field, option }: { field: TField; option: string }) => {
  return { field, option, syntax: "separate", aliases: [] } as const;
};

const separateOrJoined = <TField extends string>({ field, option }: { field: TField; option: string }) => {
  return { field, option, syntax: "separate-or-joined", aliases: [] } as const;
};

const joinedOrSeparate = <TField extends string>({ field, option }: { field: TField; option: string }) => {
  return { field, option, syntax: "joined-or-separate", aliases: [] } as const;
};

// actions besides linking, the earliest stage coming first
const actionOptions: { readonly [action in Exclude<TCcAction, "link">]: string } = {
  "preprocess": "-E",
  "analyze": "--analyze",
  "check-syntax": "-fsyntax-only",
  "generate-assembly": "-S",
  "compile": "-c",
};

const simpleQueryOptions: { readonly [kind in TCcSimpleQueryKind]: string } = {
  "version": "--version",
  "help": "--help",
  "dump-version": "-dumpversion",
  "dump-full-version": "-dumpfullversion",
  "dump-machine": "-dumpmachine",
  "dump-specs": "-dumpspecs",
  "print-libgcc-file-name": "-print-libgcc-file-name",
  "print-search-dirs": "-print-search-dirs",
  "print-multi-directory": "-print-multi-directory",
  "print-multi-lib": "-print-multi-lib",
  "print-multi-os-directory": "-print-multi-os-directory",
  "print-multiarch": "-print-multiarch",
  "print-sysroot": "-print-sysroot",
  "print-sysroot-headers-suffix": "-print-sysroot-headers-suffix",
  "print-target-triple": "-print-target-triple",
  "print-effective-triple": "-print-effective-triple",
  "print-resource-dir": "-print-resource-dir",
  "print-runtime-dir": "-print-runtime-dir",
  "print-targets": "-print-targets",
  "print-supported-cpus": "-print-supported-cpus",
};

const namedQueryOptions: { readonly [kind in TCcNamedQueryKind]: string } = {
  "print-file-name": "-print-file-name=",
  "print-prog-name": "-print-prog-name=",
};

const namedOptimizationLevels: { readonly [level in Exclude<TCcOptimizationLevel, number>]: string } = {
  "default": "-O",
  "size": "-Os",
  "min-size": "-Oz",
  "fast": "-Ofast",
  "debug": "-Og",
};

const prefixMapOptions: { readonly [kind in TCcPrefixMapKind]: string } = {
  debug: "-fdebug-prefix-map=",
  file: "-ffile-prefix-map=",
  macro: "-fmacro-prefix-map=",
  profile: "-fprofile-prefix-map=",
  coverage: "-fcoverage-prefix-map=",
};

const languages: { readonly [language in TCcLanguage]: true } = {
  "c": true,
  "c-header": true,
  "cpp-output": true,
  "c++": true,
  "c++-header": true,
  "c++-system-header": true,
  "c++-user-header": true,
  "c++-cpp-output": true,
  "objective-c": true,
  "objective-c-header": true,
  "objective-c-cpp-output": true,
  "objective-c++": true,
  "objective-c++-header": true,
  "objective-c++-cpp-output": true,
  "assembler": true,
  "assembler-with-cpp": true,
  "cuda": true,
  "hip": true,
  "cl": true,
  "ir": true,
  "lto": true,
  "ada": true,
  "d": true,
  "go": true,
  "f77": true,
  "f77-cpp-input": true,
  "f95": true,
  "f95-cpp-input": true,
};

const applePlatforms: { readonly [platform in TCcApplePlatform]: true } = {
  "macosx": true,
  "macos": true,
  "ios": true,
  "iphoneos": true,
  "ios-simulator": true,
  "iphonesimulator": true,
  "tvos": true,
  "appletvos": true,
  "tvos-simulator": true,
  "appletvsimulator": true,
  "watchos": true,
  "watchos-simulator": true,
  "watchsimulator": true,
};

const namedWarnings: { readonly [field in TFieldsOfType<TCcWarningOptions, TCcWarning | undefined>]: string } = {
  all: "all",
  extra: "extra",
  pedantic: "pedantic",
  everything: "everything",
  address: "address",
  addressOfPackedMember: "address-of-packed-member",
  allocSizeLargerThan: "alloc-size-larger-than",
  alloca: "alloca",
  arrayBounds: "array-bounds",
  arrayParameter: "array-parameter",
  attributes: "attributes",
  badFunctionCast: "bad-function-cast",
  boolConversion: "bool-conversion",
  builtinMacroRedefined: "builtin-macro-redefined",
  castAlign: "cast-align",
  castFunctionType: "cast-function-type",
  castQual: "cast-qual",
  charSubscripts: "char-subscripts",
  comma: "comma",
  comment: "comment",
  conditionalUninitialized: "conditional-uninitialized",
  constantConversion: "constant-conversion",
  conversion: "conversion",
  danglingPointer: "dangling-pointer",
  dateTime: "date-time",
  declarationAfterStatement: "declaration-after-statement",
  deprecated: "deprecated",
  deprecatedDeclarations: "deprecated-declarations",
  deprecatedNonPrototype: "deprecated-non-prototype",
  designatedInit: "designated-init",
  documentation: "documentation",
  doublePromotion: "double-promotion",
  duplicatedBranches: "duplicated-branches",
  duplicatedCond: "duplicated-cond",
  emptyBody: "empty-body",
  enumConversion: "enum-conversion",
  extraSemi: "extra-semi",
  floatConversion: "float-conversion",
  floatEqual: "float-equal",
  format: "format",
  formatNonliteral: "format-nonliteral",
  formatOverflow: "format-overflow",
  formatSecurity: "format-security",
  formatSignedness: "format-signedness",
  formatTruncation: "format-truncation",
  frameAddress: "frame-address",
  frameLargerThan: "frame-larger-than",
  freeNonheapObject: "free-nonheap-object",
  gnu: "gnu",
  ignoredQualifiers: "ignored-qualifiers",
  implicit: "implicit",
  implicitFallthrough: "implicit-fallthrough",
  implicitFunctionDeclaration: "implicit-function-declaration",
  implicitInt: "implicit-int",
  incompatibleFunctionPointerTypes: "incompatible-function-pointer-types",
  incompatiblePointerTypes: "incompatible-pointer-types",
  infiniteRecursion: "infinite-recursion",
  initSelf: "init-self",
  inline: "inline",
  intConversion: "int-conversion",
  intToPointerCast: "int-to-pointer-cast",
  invalidPch: "invalid-pch",
  jumpMissesInit: "jump-misses-init",
  logicalOp: "logical-op",
  longLong: "long-long",
  main: "main",
  maybeUninitialized: "maybe-uninitialized",
  misleadingIndentation: "misleading-indentation",
  missingBraces: "missing-braces",
  missingDeclarations: "missing-declarations",
  missingFieldInitializers: "missing-field-initializers",
  missingFormatAttribute: "missing-format-attribute",
  missingIncludeDirs: "missing-include-dirs",
  missingNoreturn: "missing-noreturn",
  missingProfile: "missing-profile",
  missingPrototypes: "missing-prototypes",
  missingVariableDeclarations: "missing-variable-declarations",
  multichar: "multichar",
  nestedExterns: "nested-externs",
  newlineEof: "newline-eof",
  nonLiteralNullConversion: "non-literal-null-conversion",
  nonVirtualDtor: "non-virtual-dtor",
  nonnull: "nonnull",
  nullDereference: "null-dereference",
  oldStyleCast: "old-style-cast",
  oldStyleDeclaration: "old-style-declaration",
  oldStyleDefinition: "old-style-definition",
  overlengthStrings: "overlength-strings",
  overloadedVirtual: "overloaded-virtual",
  packed: "packed",
  packedNotAligned: "packed-not-aligned",
  padded: "padded",
  parentheses: "parentheses",
  pessimizingMove: "pessimizing-move",
  pointerArith: "pointer-arith",
  pointerSign: "pointer-sign",
  redundantDecls: "redundant-decls",
  redundantMove: "redundant-move",
  restrict: "restrict",
  returnType: "return-type",
  sequencePoint: "sequence-point",
  shadow: "shadow",
  shiftCountOverflow: "shift-count-overflow",
  shiftNegativeValue: "shift-negative-value",
  shorten64To32: "shorten-64-to-32",
  signCompare: "sign-compare",
  signConversion: "sign-conversion",
  stackProtector: "stack-protector",
  stackUsage: "stack-usage",
  strictAliasing: "strict-aliasing",
  strictOverflow: "strict-overflow",
  strictPrototypes: "strict-prototypes",
  stringopOverflow: "stringop-overflow",
  stringopOverread: "stringop-overread",
  stringopTruncation: "stringop-truncation",
  suggestAttribute: "suggest-attribute",
  suggestOverride: "suggest-override",
  switch: "switch",
  switchDefault: "switch-default",
  switchEnum: "switch-enum",
  systemHeaders: "system-headers",
  threadSafety: "thread-safety",
  trampolines: "trampolines",
  trigraphs: "trigraphs",
  typeLimits: "type-limits",
  undef: "undef",
  uninitialized: "uninitialized",
  unknownPragmas: "unknown-pragmas",
  unknownWarningOption: "unknown-warning-option",
  unreachableCode: "unreachable-code",
  unused: "unused",
  unusedButSetParameter: "unused-but-set-parameter",
  unusedButSetVariable: "unused-but-set-variable",
  unusedCommandLineArgument: "unused-command-line-argument",
  unusedConstVariable: "unused-const-variable",
  unusedFunction: "unused-function",
  unusedLabel: "unused-label",
  unusedLocalTypedefs: "unused-local-typedefs",
  unusedMacros: "unused-macros",
  unusedParameter: "unused-parameter",
  unusedResult: "unused-result",
  unusedValue: "unused-value",
  unusedVariable: "unused-variable",
  useAfterFree: "use-after-free",
  uselessCast: "useless-cast",
  vla: "vla",
  vlaLargerThan: "vla-larger-than",
  writeStrings: "write-strings",
  zeroAsNullPointerConstant: "zero-as-null-pointer-constant",
  zeroLengthBounds: "zero-length-bounds",
};

const languageToggles: TToggleDescriptor<TCcLanguageOptions> = {
  prefix: "-f",
  names: {
    builtin: "builtin",
    exceptions: "exceptions",
    cxxExceptions: "cxx-exceptions",
    rtti: "rtti",
    threadsafeStatics: "threadsafe-statics",
    permissive: "permissive",
    msExtensions: "ms-extensions",
    msCompatibility: "ms-compatibility",
    declspec: "declspec",
    gnu89Inline: "gnu89-inline",
    gnuKeywords: "gnu-keywords",
    asm: "asm",
    blocks: "blocks",
    objcArc: "objc-arc",
    modules: "modules",
    coroutines: "coroutines",
    shortEnums: "short-enums",
    shortWchar: "short-wchar",
    dollarsInIdentifiers: "dollars-in-identifiers",
    signedBitfields: "signed-bitfields",
    sizedDeallocation: "sized-deallocation",
    char8T: "char8_t",
    strictEnums: "strict-enums",
    delayedTemplateParsing: "delayed-template-parsing",
  },
};

const machineToggles: TToggleDescriptor<TCcMachineOptions> = {
  prefix: "-m",
  names: {
    mmx: "mmx",
    sse: "sse",
    sse2: "sse2",
    sse3: "sse3",
    ssse3: "ssse3",
    sse41: "sse4.1",
    sse42: "sse4.2",
    avx: "avx",
    avx2: "avx2",
    avx512f: "avx512f",
    fma: "fma",
    f16c: "f16c",
    bmi: "bmi",
    bmi2: "bmi2",
    popcnt: "popcnt",
    lzcnt: "lzcnt",
    aes: "aes",
    pclmul: "pclmul",
    rdrnd: "rdrnd",
    movbe: "movbe",
    cx16: "cx16",
    x87: "80387",
    amd3dnow: "3dnow",
    redZone: "red-zone",
    fpRetIn387: "fp-ret-in-387",
    generalRegsOnly: "general-regs-only",
    omitLeafFramePointer: "omit-leaf-frame-pointer",
    stackrealign: "stackrealign",
    fentry: "fentry",
    recordMcount: "record-mcount",
    nopMcount: "nop-mcount",
    retpoline: "retpoline",
    indirectBranchRegister: "indirect-branch-register",
    skipRaxSetup: "skip-rax-setup",
    unalignedAccess: "unaligned-access",
    strictAlign: "strict-align",
    outlineAtomics: "outline-atomics",
    longCalls: "long-calls",
    relax: "relax",
    msBitfields: "ms-bitfields",
    unicode: "unicode",
    threads: "threads",
    dll: "dll",
    abicalls: "abicalls",
  },
};

const debugToggles: TToggleDescriptor<TCcDebugOptions> = {
  prefix: "-g",
  names: {
    splitDwarf: "split-dwarf",
    columnInfo: "column-info",
    pubnames: "pubnames",
    gnuPubnames: "gnu-pubnames",
    strictDwarf: "strict-dwarf",
    recordGccSwitches: "record-gcc-switches",
    recordCommandLine: "record-command-line",
    embedSource: "embed-source",
    inlineLineTables: "inline-line-tables",
    statementFrontiers: "statement-frontiers",
    variableLocationViews: "variable-location-views",
    asLocSupport: "as-loc-support",
    simpleTemplateNames: "simple-template-names",
    modules: "modules",
  },
};

const codeGenerationToggles: TToggleDescriptor<TCcCodeGenerationOptions> = {
  prefix: "-f",
  names: {
    common: "common",
    strictAliasing: "strict-aliasing",
    strictOverflow: "strict-overflow",
    wrapv: "wrapv",
    trapv: "trapv",
    deleteNullPointerChecks: "delete-null-pointer-checks",
    omitFramePointer: "omit-frame-pointer",
    functionSections: "function-sections",
    dataSections: "data-sections",
    asynchronousUnwindTables: "asynchronous-unwind-tables",
    unwindTables: "unwind-tables",
    plt: "plt",
    semanticInterposition: "semantic-interposition",
    stackClashProtection: "stack-clash-protection",
    splitStack: "split-stack",
    fastMath: "fast-math",
    mathErrno: "math-errno",
    finiteMathOnly: "finite-math-only",
    trappingMath: "trapping-math",
    roundingMath: "rounding-math",
    signedZeros: "signed-zeros",
    associativeMath: "associative-math",
    reciprocalMath: "reciprocal-math",
    unsafeMathOptimizations: "unsafe-math-optimizations",
    inline: "inline",
    inlineFunctions: "inline-functions",
    inlineSmallFunctions: "inline-small-functions",
    inlineFunctionsCalledOnce: "inline-functions-called-once",
    unrollLoops: "unroll-loops",
    unrollAllLoops: "unroll-all-loops",
    peelLoops: "peel-loops",
    vectorize: "vectorize",
    slpVectorize: "slp-vectorize",
    treeVectorize: "tree-vectorize",
    treeLoopVectorize: "tree-loop-vectorize",
    treeSlpVectorize: "tree-slp-vectorize",
    treeLoopDistributePatterns: "tree-loop-distribute-patterns",
    jumpTables: "jump-tables",
    optimizeSiblingCalls: "optimize-sibling-calls",
    toplevelReorder: "toplevel-reorder",
    reorderFunctions: "reorder-functions",
    reorderBlocks: "reorder-blocks",
    mergeConstants: "merge-constants",
    mergeAllConstants: "merge-all-constants",
    zeroInitializedInBss: "zero-initialized-in-bss",
    keepInlineFunctions: "keep-inline-functions",
    keepStaticConsts: "keep-static-consts",
    ident: "ident",
    dwarf2CfiAsm: "dwarf2-cfi-asm",
    conserveStack: "conserve-stack",
    stackUsage: "stack-usage",
    visibilityInlinesHidden: "visibility-inlines-hidden",
    fatLtoObjects: "fat-lto-objects",
    useLinkerPlugin: "use-linker-plugin",
    wholeProgram: "whole-program",
    varTracking: "var-tracking",
    varTrackingAssignments: "var-tracking-assignments",
    ipaSra: "ipa-sra",
    allowStoreDataRaces: "allow-store-data-races",
    strictVolatileBitfields: "strict-volatile-bitfields",
    verboseAsm: "verbose-asm",
  },
};

const linkerToggles: TToggleDescriptor<TCcLinkerOptions> = {
  prefix: "-",
  names: {
    pie: "pie",
  },
};

const driverDescriptor: TGroupDescriptor<"driver"> = {
  group: "driver",
  flags: {
    verbose: "-v",
    dryRun: "-###",
    pipe: "-pipe",
    pthread: "-pthread",
    emitLlvm: "-emit-llvm",
    noCanonicalPrefixes: "-no-canonical-prefixes",
    suppressUnusedArgumentWarnings: "-Qunused-arguments",
  },
  toggles: {
    prefix: "-f",
    names: {
      integratedAssembler: "integrated-as",
    },
  },
  choices: [],
  enums: [
    { ...joined({ field: "saveTemps", option: "-save-temps=" }), values: ["cwd", "obj"], bareValue: "cwd" },
  ],
  strings: [
    separate({ field: "workingDirectory", option: "-working-directory" }),
    separateOrJoined({ field: "compilationDatabaseFile", option: "-MJ" }),
    separate({ field: "indexStorePath", option: "-index-store-path" }),
  ],
  numbers: [],
  lists: [
    joinedOrSeparate({ field: "toolchainPrefixes", option: "-B" }),
    { ...joined({ field: "specs", option: "-specs=" }), aliases: [{ option: "--specs=", syntax: "joined" }] },
    joined({ field: "plugins", option: "-fplugin=" }),
    separate({ field: "clangArguments", option: "-Xclang" }),
    separate({ field: "llvmArguments", option: "-mllvm" }),
  ],
  valuedToggles: [],
};

const targetDescriptor: TGroupDescriptor<"target"> = {
  group: "target",
  flags: {},
  toggles: { prefix: "", names: {} },
  choices: [],
  enums: [],
  strings: [
    {
      ...joined({ field: "triple", option: "--target=" }),
      aliases: [{ option: "-target", syntax: "separate" }, { option: "--target", syntax: "separate" }],
    },
    { ...joined({ field: "sysroot", option: "--sysroot=" }), aliases: [{ option: "--sysroot", syntax: "separate" }] },
    separateOrJoined({ field: "headerSysroot", option: "-isysroot" }),
    {
      ...joined({ field: "gccToolchain", option: "--gcc-toolchain=" }),
      aliases: [{ option: "-gcc-toolchain", syntax: "separate" }],
    },
    {
      ...separate({ field: "resourceDirectory", option: "-resource-dir" }),
      aliases: [{ option: "-resource-dir=", syntax: "joined" }],
    },
  ],
  numbers: [],
  lists: [
    separate({ field: "architectures", option: "-arch" }),
  ],
  valuedToggles: [],
};

const languageDescriptor: TGroupDescriptor<"language"> = {
  group: "language",
  flags: {
    ansi: "-ansi",
  },
  toggles: languageToggles,
  choices: [
    {
      field: "charSignedness",
      choices: [
        { option: "-fsigned-char", value: "signed" },
        { option: "-funsigned-char", value: "unsigned" },
        { option: "-fno-signed-char", value: "unsigned" },
        { option: "-fno-unsigned-char", value: "signed" },
      ],
    },
    {
      field: "environment",
      choices: [
        { option: "-fhosted", value: "hosted" },
        { option: "-ffreestanding", value: "freestanding" },
        { option: "-fno-hosted", value: "freestanding" },
        { option: "-fno-freestanding", value: "hosted" },
      ],
    },
  ],
  enums: [
    {
      ...joined({ field: "cxxStandardLibrary", option: "-stdlib=" }),
      aliases: [{ option: "--stdlib=", syntax: "joined" }, { option: "--stdlib", syntax: "separate" }],
      values: ["libc++", "libstdc++", "platform"],
      bareValue: undefined,
    },
  ],
  strings: [
    {
      ...joined({ field: "standard", option: "-std=" }),
      aliases: [{ option: "--std=", syntax: "joined" }, { option: "--std", syntax: "separate" }],
    },
    joined({ field: "inputCharset", option: "-finput-charset=" }),
    joined({ field: "execCharset", option: "-fexec-charset=" }),
    joined({ field: "wideExecCharset", option: "-fwide-exec-charset=" }),
    joined({ field: "moduleName", option: "-fmodule-name=" }),
    joined({ field: "modulesCachePath", option: "-fmodules-cache-path=" }),
  ],
  numbers: [
    joined({ field: "templateDepth", option: "-ftemplate-depth=" }),
    joined({ field: "constexprDepth", option: "-fconstexpr-depth=" }),
  ],
  lists: [
    joined({ field: "disabledBuiltins", option: "-fno-builtin-" }),
    joined({ field: "moduleMapFiles", option: "-fmodule-map-file=" }),
    joined({ field: "moduleFiles", option: "-fmodule-file=" }),
    joined({ field: "prebuiltModulePaths", option: "-fprebuilt-module-path=" }),
  ],
  valuedToggles: [
    { field: "openmp", prefix: "-f", name: "openmp", values: undefined, aliases: [] },
  ],
};

const machineDescriptor: TGroupDescriptor<"machine"> = {
  group: "machine",
  flags: {},
  toggles: machineToggles,
  choices: [
    {
      field: "wordSize",
      choices: [
        { option: "-m16", value: "16" },
        { option: "-m32", value: "32" },
        { option: "-m64", value: "64" },
        { option: "-mx32", value: "x32" },
      ],
    },
    {
      field: "instructionSet",
      choices: [
        { option: "-marm", value: "arm" },
        { option: "-mthumb", value: "thumb" },
      ],
    },
    {
      field: "endianness",
      choices: [
        { option: "-mlittle-endian", value: "little" },
        { option: "-mbig-endian", value: "big" },
      ],
    },
    {
      field: "floatingPoint",
      choices: [
        { option: "-msoft-float", value: "soft" },
        { option: "-mhard-float", value: "hard" },
      ],
    },
    {
      field: "subsystem",
      choices: [
        { option: "-mconsole", value: "console" },
        { option: "-mwindows", value: "windows" },
      ],
    },
  ],
  enums: [
    { ...joined({ field: "floatAbi", option: "-mfloat-abi=" }), values: ["soft", "softfp", "hard"], bareValue: undefined },
    { ...joined({ field: "asmDialect", option: "-masm=" }), values: ["att", "intel"], bareValue: undefined },
  ],
  strings: [
    joined({ field: "architecture", option: "-march=" }),
    joined({ field: "tune", option: "-mtune=" }),
    joined({ field: "cpu", option: "-mcpu=" }),
    joined({ field: "fpu", option: "-mfpu=" }),
    joined({ field: "abi", option: "-mabi=" }),
    joined({ field: "codeModel", option: "-mcmodel=" }),
    joined({ field: "branchProtection", option: "-mbranch-protection=" }),
    joined({ field: "indirectBranch", option: "-mindirect-branch=" }),
    joined({ field: "functionReturn", option: "-mfunction-return=" }),
    joined({ field: "tlsDialect", option: "-mtls-dialect=" }),
    joined({ field: "fpmath", option: "-mfpmath=" }),
    joined({ field: "stackProtectorGuard", option: "-mstack-protector-guard=" }),
    joined({ field: "stackProtectorGuardRegister", option: "-mstack-protector-guard-reg=" }),
    joined({ field: "stackProtectorGuardOffset", option: "-mstack-protector-guard-offset=" }),
  ],
  numbers: [
    joined({ field: "preferredStackBoundary", option: "-mpreferred-stack-boundary=" }),
    joined({ field: "incomingStackBoundary", option: "-mincoming-stack-boundary=" }),
    joined({ field: "regparm", option: "-mregparm=" }),
    joinedOrSeparate({ field: "smallDataThreshold", option: "-G" }),
  ],
  lists: [],
  valuedToggles: [],
};

const preprocessorDescriptor: TGroupDescriptor<"preprocessor"> = {
  group: "preprocessor",
  flags: {
    nostdinc: "-nostdinc",
    nostdincxx: "-nostdinc++",
    undef: "-undef",
    noLineMarkers: "-P",
    printIncludes: "-H",
    traditional: "-traditional",
    traditionalCpp: "-traditional-cpp",
    trigraphs: "-trigraphs",
    includeDump: "-dI",
  },
  toggles: {
    prefix: "-f",
    names: {
      directivesOnly: "directives-only",
      preprocessed: "preprocessed",
      workingDirectory: "working-directory",
    },
  },
  choices: [
    {
      field: "comments",
      choices: [
        { option: "-C", value: "keep" },
        { option: "-CC", value: "keep-in-macros" },
      ],
    },
    {
      field: "macroDump",
      choices: [
        { option: "-dM", value: "definitions" },
        { option: "-dD", value: "definitions-and-output" },
        { option: "-dN", value: "names" },
        { option: "-dU", value: "used" },
      ],
    },
  ],
  enums: [],
  strings: [
    separateOrJoined({ field: "includePrefix", option: "-iprefix" }),
    separateOrJoined({ field: "multilib", option: "-imultilib" }),
    separate({ field: "precompiledHeader", option: "-include-pch" }),
  ],
  numbers: [],
  lists: [
    joinedOrSeparate({ field: "includeDirectories", option: "-I" }),
    separateOrJoined({ field: "quoteIncludeDirectories", option: "-iquote" }),
    separateOrJoined({ field: "systemIncludeDirectories", option: "-isystem" }),
    separateOrJoined({ field: "afterIncludeDirectories", option: "-idirafter" }),
    joinedOrSeparate({ field: "frameworkDirectories", option: "-F" }),
    separateOrJoined({ field: "systemFrameworkDirectories", option: "-iframework" }),
    separateOrJoined({ field: "prefixedIncludeDirectories", option: "-iwithprefix" }),
    separateOrJoined({ field: "prefixedBeforeIncludeDirectories", option: "-iwithprefixbefore" }),
    separateOrJoined({ field: "includeFiles", option: "-include" }),
    separateOrJoined({ field: "macroFiles", option: "-imacros" }),
    separateOrJoined({ field: "vfsOverlays", option: "-ivfsoverlay" }),
    joinedOrSeparate({ field: "assertions", option: "-A" }),
  ],
  valuedToggles: [],
};

const dependenciesDescriptor: TGroupDescriptor<"dependencies", "generate" | "file" | "includeSystemHeaderFiles"> = {
  group: "dependencies",
  flags: {
    includeMissing: "-MP",
    missingHeadersAreGenerated: "-MG",
  },
  toggles: { prefix: "", names: {} },
  choices: [],
  enums: [],
  strings: [],
  numbers: [],
  lists: [],
  valuedToggles: [],
};

const debugDescriptor: TGroupDescriptor<"debug"> = {
  group: "debug",
  flags: {
    enable: "-g",
    lineTablesOnly: "-gline-tables-only",
    lineDirectivesOnly: "-gline-directives-only",
  },
  toggles: debugToggles,
  choices: [
    {
      field: "format",
      choices: [
        { option: "-ggdb", value: "gdb" },
        { option: "-glldb", value: "lldb" },
        { option: "-gsce", value: "sce" },
        { option: "-gdbx", value: "dbx" },
        { option: "-gdwarf", value: "dwarf" },
        { option: "-gstabs", value: "stabs" },
        { option: "-gstabs+", value: "stabs+" },
        { option: "-gxcoff", value: "xcoff" },
        { option: "-gxcoff+", value: "xcoff+" },
        { option: "-gvms", value: "vms" },
        { option: "-gcodeview", value: "codeview" },
        { option: "-gbtf", value: "btf" },
        { option: "-gctf", value: "ctf" },
      ],
    },
    {
      field: "dwarfFormat",
      choices: [
        { option: "-gdwarf32", value: "32" },
        { option: "-gdwarf64", value: "64" },
      ],
    },
  ],
  enums: [
    { ...joined({ field: "compression", option: "-gz=" }), values: ["none", "zlib", "zlib-gnu", "zstd"], bareValue: "zlib" },
  ],
  strings: [],
  numbers: [
    joined({ field: "dwarfVersion", option: "-gdwarf-" }),
  ],
  lists: [],
  valuedToggles: [],
};

const codeGenerationDescriptor: TGroupDescriptor<"codeGeneration"> = {
  group: "codeGeneration",
  flags: {},
  toggles: codeGenerationToggles,
  choices: [
    {
      field: "pic",
      choices: [
        { option: "-fpic", value: "small" },
        { option: "-fPIC", value: "large" },
        { option: "-fno-pic", value: false },
        { option: "-fno-PIC", value: false },
      ],
    },
    {
      field: "pie",
      choices: [
        { option: "-fpie", value: "small" },
        { option: "-fPIE", value: "large" },
        { option: "-fno-pie", value: false },
        { option: "-fno-PIE", value: false },
      ],
    },
    {
      field: "stackProtector",
      choices: [
        { option: "-fstack-protector", value: "default" },
        { option: "-fstack-protector-strong", value: "strong" },
        { option: "-fstack-protector-all", value: "all" },
        { option: "-fstack-protector-explicit", value: "explicit" },
        { option: "-fno-stack-protector", value: false },
      ],
    },
  ],
  enums: [
    {
      ...joined({ field: "visibility", option: "-fvisibility=" }),
      values: ["default", "hidden", "protected", "internal"],
      bareValue: undefined,
    },
    {
      ...joined({ field: "tlsModel", option: "-ftls-model=" }),
      values: ["global-dynamic", "local-dynamic", "initial-exec", "local-exec"],
      bareValue: undefined,
    },
    {
      ...joined({ field: "controlFlowProtection", option: "-fcf-protection=" }),
      values: ["full", "branch", "return", "none", "check"],
      bareValue: "full",
    },
    {
      ...joined({ field: "trivialAutoVarInit", option: "-ftrivial-auto-var-init=" }),
      values: ["uninitialized", "zero", "pattern"],
      bareValue: undefined,
    },
    {
      ...joined({ field: "fpContract", option: "-ffp-contract=" }),
      values: ["off", "on", "fast", "fast-honor-pragmas"],
      bareValue: undefined,
    },
    { ...joined({ field: "fpModel", option: "-ffp-model=" }), values: ["precise", "strict", "fast"], bareValue: undefined },
    {
      ...joined({ field: "excessPrecision", option: "-fexcess-precision=" }),
      values: ["standard", "fast", "16"],
      bareValue: undefined,
    },
  ],
  strings: [
    joined({ field: "zeroCallUsedRegs", option: "-fzero-call-used-regs=" }),
    joined({ field: "patchableFunctionEntry", option: "-fpatchable-function-entry=" }),
    joined({ field: "randomSeed", option: "-frandom-seed=" }),
  ],
  numbers: [],
  lists: [
    joined({ field: "fixedRegisters", option: "-ffixed-" }),
  ],
  valuedToggles: [
    { field: "lto", prefix: "-f", name: "lto", values: undefined, aliases: [] },
    { field: "stackCheck", prefix: "-f", name: "stack-check", values: undefined, aliases: [] },
    { field: "strictFlexArrays", prefix: "-f", name: "strict-flex-arrays", values: undefined, aliases: [] },
    { field: "alignFunctions", prefix: "-f", name: "align-functions", values: undefined, aliases: [] },
    { field: "alignJumps", prefix: "-f", name: "align-jumps", values: undefined, aliases: [] },
    { field: "alignLoops", prefix: "-f", name: "align-loops", values: undefined, aliases: [] },
    { field: "alignLabels", prefix: "-f", name: "align-labels", values: undefined, aliases: [] },
  ],
};

const instrumentationDescriptor: TGroupDescriptor<"instrumentation"> = {
  group: "instrumentation",
  flags: {
    coverage: "--coverage",
    gprof: "-pg",
    prof: "-p",
  },
  toggles: {
    prefix: "-f",
    names: {
      profileArcs: "profile-arcs",
      testCoverage: "test-coverage",
      coverageMapping: "coverage-mapping",
      instrumentFunctions: "instrument-functions",
    },
  },
  choices: [],
  enums: [
    {
      ...joined({ field: "profileUpdate", option: "-fprofile-update=" }),
      values: ["single", "atomic", "prefer-atomic"],
      bareValue: undefined,
    },
  ],
  strings: [],
  numbers: [],
  lists: [
    joined({ field: "sanitizerIgnoreLists", option: "-fsanitize-ignorelist=" }),
    joined({ field: "sanitizerBlacklists", option: "-fsanitize-blacklist=" }),
  ],
  valuedToggles: [
    { field: "profileGenerate", prefix: "-f", name: "profile-generate", values: undefined, aliases: [] },
    { field: "profileUse", prefix: "-f", name: "profile-use", values: undefined, aliases: [] },
    { field: "profileInstrGenerate", prefix: "-f", name: "profile-instr-generate", values: undefined, aliases: [] },
    { field: "profileInstrUse", prefix: "-f", name: "profile-instr-use", values: undefined, aliases: [] },
  ],
};

const diagnosticsDescriptor: TGroupDescriptor<"diagnostics"> = {
  group: "diagnostics",
  flags: {},
  toggles: {
    prefix: "-f",
    names: {
      showOption: "diagnostics-show-option",
      showCaret: "diagnostics-show-caret",
    },
  },
  choices: [],
  enums: [],
  strings: [
    joined({ field: "format", option: "-fdiagnostics-format=" }),
    {
      ...separate({ field: "serializeFile", option: "-serialize-diagnostics" }),
      aliases: [{ option: "--serialize-diagnostics", syntax: "separate" }],
    },
  ],
  numbers: [
    joined({ field: "messageLength", option: "-fmessage-length=" }),
    joined({ field: "maxErrors", option: "-fmax-errors=" }),
    joined({ field: "errorLimit", option: "-ferror-limit=" }),
  ],
  lists: [],
  valuedToggles: [
    {
      field: "color",
      prefix: "-f",
      name: "diagnostics-color",
      values: ["always", "never", "auto"],
      aliases: [{ option: "-fcolor-diagnostics", value: true }, { option: "-fno-color-diagnostics", value: false }],
    },
  ],
};

const warningsDescriptor: TGroupDescriptor<"warnings"> = {
  group: "warnings",
  flags: {
    suppressAll: "-w",
    pedanticErrors: "-pedantic-errors",
  },
  toggles: {
    prefix: "-W",
    names: {
      error: "error",
      fatalErrors: "fatal-errors",
    },
  },
  choices: [],
  enums: [],
  strings: [],
  numbers: [],
  lists: [],
  valuedToggles: [],
};

const linkerDescriptor: TGroupDescriptor<"linker"> = {
  group: "linker",
  flags: {
    shared: "-shared",
    static: "-static",
    staticPie: "-static-pie",
    relocatable: "-r",
    rdynamic: "-rdynamic",
    strip: "-s",
    staticLibgcc: "-static-libgcc",
    sharedLibgcc: "-shared-libgcc",
    staticLibstdcxx: "-static-libstdc++",
    staticLibsan: "-static-libsan",
    nostdlib: "-nostdlib",
    nostdlibxx: "-nostdlib++",
    nodefaultlibs: "-nodefaultlibs",
    nostartfiles: "-nostartfiles",
    nolibc: "-nolibc",
    dynamicLibrary: "-dynamiclib",
    bundle: "-bundle",
    headerpadMaxInstallNames: "-headerpad_max_install_names",
    deadStrip: "-dead_strip",
    flatNamespace: "-flat_namespace",
  },
  toggles: linkerToggles,
  choices: [],
  enums: [
    {
      ...joined({ field: "runtimeLibrary", option: "--rtlib=" }),
      aliases: [{ option: "-rtlib=", syntax: "joined" }],
      values: ["libgcc", "compiler-rt", "platform"],
      bareValue: undefined,
    },
    {
      ...joined({ field: "unwindLibrary", option: "--unwindlib=" }),
      aliases: [{ option: "-unwindlib=", syntax: "joined" }],
      values: ["libgcc", "libunwind", "platform", "none"],
      bareValue: undefined,
    },
    {
      ...separate({ field: "undefinedSymbolTreatment", option: "-undefined" }),
      values: ["error", "warning", "suppress", "dynamic_lookup"],
      bareValue: undefined,
    },
  ],
  strings: [
    { ...separate({ field: "entryPoint", option: "-e" }), aliases: [{ option: "--entry=", syntax: "joined" }] },
    joined({ field: "useLinker", option: "-fuse-ld=" }),
    joined({ field: "linkerPath", option: "--ld-path=" }),
    separate({ field: "bundleLoader", option: "-bundle_loader" }),
    separate({ field: "installName", option: "-install_name" }),
    separate({ field: "compatibilityVersion", option: "-compatibility_version" }),
    separate({ field: "currentVersion", option: "-current_version" }),
    separate({ field: "exportedSymbolsList", option: "-exported_symbols_list" }),
  ],
  numbers: [],
  lists: [
    joinedOrSeparate({ field: "libraryDirectories", option: "-L" }),
    joinedOrSeparate({ field: "scripts", option: "-T" }),
    separateOrJoined({ field: "undefinedSymbols", option: "-u" }),
    separate({ field: "keywords", option: "-z" }),
    separate({ field: "rpaths", option: "-rpath" }),
  ],
  valuedToggles: [],
};

// options followed by comma separated names, bare ones without their "=" stand for all sanitizers
const sanitizerOptions: {
  readonly [field in "sanitizers" | "sanitizerRecover" | "sanitizerTrap"]: { enabled: string; disabled: string; bare: boolean };
} = {
  sanitizers: { enabled: "-fsanitize=", disabled: "-fno-sanitize=", bare: false },
  sanitizerRecover: { enabled: "-fsanitize-recover=", disabled: "-fno-sanitize-recover=", bare: true },
  sanitizerTrap: { enabled: "-fsanitize-trap=", disabled: "-fno-sanitize-trap=", bare: true },
};

// in the order they are formatted
const groupDescriptors: readonly TAnyGroupDescriptor[] = [
  driverDescriptor,
  targetDescriptor,
  languageDescriptor,
  machineDescriptor,
  debugDescriptor,
  codeGenerationDescriptor,
  instrumentationDescriptor,
  diagnosticsDescriptor,
  warningsDescriptor,
  preprocessorDescriptor,
  dependenciesDescriptor,
  linkerDescriptor,
];

export {
  actionOptions,
  applePlatforms,
  codeGenerationToggles,
  debugToggles,
  groupDescriptors,
  languages,
  languageToggles,
  linkerToggles,
  machineToggles,
  namedOptimizationLevels,
  namedQueryOptions,
  namedWarnings,
  prefixMapOptions,
  sanitizerOptions,
  simpleQueryOptions
};

export type {
  TAnyGroupDescriptor,
  TOptionSpelling,
  TOptionSyntax
};
