import {
  codeGenerationToggles,
  debugToggles,
  languageToggles,
  linkerToggles,
  machineToggles,
  namedWarnings
} from "./option-descriptors.ts";

// the earliest stage wins, e.g. -E together with -c only preprocesses
type TCcAction =
  // -E, also implied by -M and -MM
  | "preprocess"
  // --analyze
  | "analyze"
  // -fsyntax-only
  | "check-syntax"
  // -S
  | "generate-assembly"
  // -c
  | "compile"
  | "link";

// languages of -x
type TCcLanguage =
  | "c"
  | "c-header"
  | "cpp-output"
  | "c++"
  | "c++-header"
  | "c++-system-header"
  | "c++-user-header"
  | "c++-cpp-output"
  | "objective-c"
  | "objective-c-header"
  | "objective-c-cpp-output"
  | "objective-c++"
  | "objective-c++-header"
  | "objective-c++-cpp-output"
  | "assembler"
  | "assembler-with-cpp"
  | "cuda"
  | "hip"
  | "cl"
  | "ir"
  | "lto"
  | "ada"
  | "d"
  | "go"
  | "f77"
  | "f77-cpp-input"
  | "f95"
  | "f95-cpp-input";

// inputs keep their command line order, as it matters for linking, e.g. -Wl,--whole-archive -lfoo
type TCcInput =
  | {
    // a path, "-" for stdin
    kind: "file";
    path: string;
    // the -x in effect, undefined after -x none
    language: TCcLanguage | undefined;
  }
  | {
    // -l<name>, -l <name>
    kind: "library";
    name: string;
  }
  | {
    // -framework <name>, -weak_framework <name>
    kind: "framework";
    name: string;
    weak: boolean;
  }
  | {
    // -Wl,<arguments>, -Xlinker <argument>
    kind: "linker-arguments";
    args: readonly string[];
  }
  | {
    // @<path>
    kind: "response-file";
    path: string;
  };

type TCcSimpleQueryKind =
  // --version
  | "version"
  // --help
  | "help"
  // -dumpversion
  | "dump-version"
  // -dumpfullversion
  | "dump-full-version"
  // -dumpmachine
  | "dump-machine"
  // -dumpspecs
  | "dump-specs"
  // -print-libgcc-file-name
  | "print-libgcc-file-name"
  // -print-search-dirs
  | "print-search-dirs"
  // -print-multi-directory
  | "print-multi-directory"
  // -print-multi-lib
  | "print-multi-lib"
  // -print-multi-os-directory
  | "print-multi-os-directory"
  // -print-multiarch
  | "print-multiarch"
  // -print-sysroot
  | "print-sysroot"
  // -print-sysroot-headers-suffix
  | "print-sysroot-headers-suffix"
  // -print-target-triple
  | "print-target-triple"
  // -print-effective-triple
  | "print-effective-triple"
  // -print-resource-dir
  | "print-resource-dir"
  // -print-runtime-dir
  | "print-runtime-dir"
  // -print-targets
  | "print-targets"
  // -print-supported-cpus
  | "print-supported-cpus";

type TCcNamedQueryKind =
  // -print-file-name=<name>
  | "print-file-name"
  // -print-prog-name=<name>
  | "print-prog-name";

type TCcQuery =
  | {
    kind: TCcSimpleQueryKind;
  }
  | {
    kind: TCcNamedQueryKind;
    name: string;
  };

// -O, -O<level>, -Os, -Oz, -Ofast, -Og
type TCcOptimizationLevel = number | "default" | "size" | "min-size" | "fast" | "debug";

type TCcMacro =
  | {
    // -D<name>, -D<name>=<value>
    kind: "define";
    name: string;
    value: string | undefined;
  }
  | {
    // -U<name>
    kind: "undefine";
    name: string;
  };

type TCcDependencyTarget = {
  name: string;
  // -MQ instead of -MT
  quoted: boolean;
};

type TCcPrefixMapKind = "debug" | "file" | "macro" | "profile" | "coverage";

// -f<kind>-prefix-map=<from>=<to>
type TCcPrefixMap = {
  kind: TCcPrefixMapKind;
  from: string;
  to: string;
};

// -fsanitize=<name>, -fno-sanitize=<name> and alike
type TCcSanitizerSetting = {
  name: string;
  enabled: boolean;
};

// --param <name>=<value>
type TCcParameter = {
  name: string;
  value: string;
};

// -Xarch_<architecture> <argument>
type TCcArchitectureArgument = {
  architecture: string;
  argument: string;
};

type TCcApplePlatform =
  | "macosx"
  | "macos"
  | "ios"
  | "iphoneos"
  | "ios-simulator"
  | "iphonesimulator"
  | "tvos"
  | "appletvos"
  | "tvos-simulator"
  | "appletvsimulator"
  | "watchos"
  | "watchos-simulator"
  | "watchsimulator";

// -m<platform>-version-min=<version>
type TCcAppleDeploymentTarget = {
  platform: TCcApplePlatform;
  version: string;
};

// -W<name>[=<value>], -Wno-<name>, -Werror=<name>, -Wno-error=<name>
type TCcWarning = {
  enabled: boolean | undefined;
  error: boolean | undefined;
  value: string | undefined;
};

type TCcDriverOptions = {
  // -v
  verbose: true | undefined;
  // -###
  dryRun: true | undefined;
  // -pipe
  pipe: true | undefined;
  // -pthread
  pthread: true | undefined;
  // -emit-llvm
  emitLlvm: true | undefined;
  // -no-canonical-prefixes
  noCanonicalPrefixes: true | undefined;
  // -Qunused-arguments
  suppressUnusedArgumentWarnings: true | undefined;
  // -fintegrated-as, -fno-integrated-as, -integrated-as, -no-integrated-as
  integratedAssembler: boolean | undefined;
  // -save-temps, -save-temps=<where>
  saveTemps: "cwd" | "obj" | undefined;
  // -working-directory <dir>
  workingDirectory: string | undefined;
  // -MJ <file>
  compilationDatabaseFile: string | undefined;
  // -index-store-path <dir>
  indexStorePath: string | undefined;
  // -B<prefix>
  toolchainPrefixes: readonly string[];
  // -specs=<file>, --specs=<file>
  specs: readonly string[];
  // -fplugin=<file>
  plugins: readonly string[];
  // -Xclang <argument>
  clangArguments: readonly string[];
  // -mllvm <argument>
  llvmArguments: readonly string[];
  // -Wa,<arguments>, -Xassembler <argument>
  assemblerArguments: readonly string[];
  // -Wp,<arguments>, -Xpreprocessor <argument>
  preprocessorArguments: readonly string[];
  // --param <name>=<value>, --param=<name>=<value>
  parameters: readonly TCcParameter[];
  // -Xarch_<architecture> <argument>
  architectureArguments: readonly TCcArchitectureArgument[];
};

type TCcTargetOptions = {
  // --target=<triple>, -target <triple>
  triple: string | undefined;
  // --sysroot=<dir>, --sysroot <dir>
  sysroot: string | undefined;
  // -isysroot <dir>
  headerSysroot: string | undefined;
  // --gcc-toolchain=<dir>, -gcc-toolchain <dir>
  gccToolchain: string | undefined;
  // -resource-dir <dir>
  resourceDirectory: string | undefined;
  // -arch <architecture>
  architectures: readonly string[];
  // -mmacosx-version-min=<version> and alike
  appleDeploymentTarget: TCcAppleDeploymentTarget | undefined;
};

type TCcLanguageOptions = {
  // -std=<standard>, --std=<standard>, --std <standard>
  standard: string | undefined;
  // -ansi
  ansi: true | undefined;
  // -stdlib=<library>
  cxxStandardLibrary: "libc++" | "libstdc++" | "platform" | undefined;
  // -fsigned-char, -funsigned-char
  charSignedness: "signed" | "unsigned" | undefined;
  // -fhosted, -ffreestanding
  environment: "hosted" | "freestanding" | undefined;
  // -fopenmp, -fopenmp=<runtime>, -fno-openmp
  openmp: boolean | string | undefined;
  // -finput-charset=<charset>
  inputCharset: string | undefined;
  // -fexec-charset=<charset>
  execCharset: string | undefined;
  // -fwide-exec-charset=<charset>
  wideExecCharset: string | undefined;
  // -ftemplate-depth=<depth>
  templateDepth: number | undefined;
  // -fconstexpr-depth=<depth>
  constexprDepth: number | undefined;
  // -fno-builtin-<function>
  disabledBuiltins: readonly string[];
  // -fmodule-name=<name>
  moduleName: string | undefined;
  // -fmodules-cache-path=<dir>
  modulesCachePath: string | undefined;
  // -fmodule-map-file=<file>
  moduleMapFiles: readonly string[];
  // -fmodule-file=[<name>=]<file>
  moduleFiles: readonly string[];
  // -fprebuilt-module-path=<dir>
  prebuiltModulePaths: readonly string[];

  // -f<name>, -fno-<name>
  builtin: boolean | undefined;
  exceptions: boolean | undefined;
  cxxExceptions: boolean | undefined;
  rtti: boolean | undefined;
  threadsafeStatics: boolean | undefined;
  permissive: boolean | undefined;
  msExtensions: boolean | undefined;
  msCompatibility: boolean | undefined;
  declspec: boolean | undefined;
  gnu89Inline: boolean | undefined;
  gnuKeywords: boolean | undefined;
  asm: boolean | undefined;
  blocks: boolean | undefined;
  objcArc: boolean | undefined;
  modules: boolean | undefined;
  coroutines: boolean | undefined;
  shortEnums: boolean | undefined;
  shortWchar: boolean | undefined;
  dollarsInIdentifiers: boolean | undefined;
  signedBitfields: boolean | undefined;
  sizedDeallocation: boolean | undefined;
  char8T: boolean | undefined;
  strictEnums: boolean | undefined;
  delayedTemplateParsing: boolean | undefined;
};

type TCcMachineOptions = {
  // -march=<architecture>
  architecture: string | undefined;
  // -mtune=<cpu>
  tune: string | undefined;
  // -mcpu=<cpu>
  cpu: string | undefined;
  // -mfpu=<fpu>
  fpu: string | undefined;
  // -mabi=<abi>
  abi: string | undefined;
  // -mcmodel=<model>
  codeModel: string | undefined;
  // -mfloat-abi=<abi>
  floatAbi: "soft" | "softfp" | "hard" | undefined;
  // -mbranch-protection=<protection>
  branchProtection: string | undefined;
  // -mindirect-branch=<choice>
  indirectBranch: string | undefined;
  // -mfunction-return=<choice>
  functionReturn: string | undefined;
  // -mtls-dialect=<dialect>
  tlsDialect: string | undefined;
  // -mfpmath=<unit>
  fpmath: string | undefined;
  // -masm=<dialect>
  asmDialect: "att" | "intel" | undefined;
  // -mstack-protector-guard=<guard>
  stackProtectorGuard: string | undefined;
  // -mstack-protector-guard-reg=<register>
  stackProtectorGuardRegister: string | undefined;
  // -mstack-protector-guard-offset=<offset>
  stackProtectorGuardOffset: string | undefined;
  // -mpreferred-stack-boundary=<n>
  preferredStackBoundary: number | undefined;
  // -mincoming-stack-boundary=<n>
  incomingStackBoundary: number | undefined;
  // -mregparm=<n>
  regparm: number | undefined;
  // -G<n>, -G <n>
  smallDataThreshold: number | undefined;
  // -m16, -m32, -m64, -mx32
  wordSize: "16" | "32" | "64" | "x32" | undefined;
  // -marm, -mthumb
  instructionSet: "arm" | "thumb" | undefined;
  // -mlittle-endian, -mbig-endian
  endianness: "little" | "big" | undefined;
  // -msoft-float, -mhard-float
  floatingPoint: "soft" | "hard" | undefined;
  // -mconsole, -mwindows
  subsystem: "console" | "windows" | undefined;

  // -m<name>, -mno-<name>
  mmx: boolean | undefined;
  sse: boolean | undefined;
  sse2: boolean | undefined;
  sse3: boolean | undefined;
  ssse3: boolean | undefined;
  sse41: boolean | undefined;
  sse42: boolean | undefined;
  avx: boolean | undefined;
  avx2: boolean | undefined;
  avx512f: boolean | undefined;
  fma: boolean | undefined;
  f16c: boolean | undefined;
  bmi: boolean | undefined;
  bmi2: boolean | undefined;
  popcnt: boolean | undefined;
  lzcnt: boolean | undefined;
  aes: boolean | undefined;
  pclmul: boolean | undefined;
  rdrnd: boolean | undefined;
  movbe: boolean | undefined;
  cx16: boolean | undefined;
  x87: boolean | undefined;
  amd3dnow: boolean | undefined;
  redZone: boolean | undefined;
  fpRetIn387: boolean | undefined;
  generalRegsOnly: boolean | undefined;
  omitLeafFramePointer: boolean | undefined;
  stackrealign: boolean | undefined;
  fentry: boolean | undefined;
  recordMcount: boolean | undefined;
  nopMcount: boolean | undefined;
  retpoline: boolean | undefined;
  indirectBranchRegister: boolean | undefined;
  skipRaxSetup: boolean | undefined;
  unalignedAccess: boolean | undefined;
  strictAlign: boolean | undefined;
  outlineAtomics: boolean | undefined;
  longCalls: boolean | undefined;
  relax: boolean | undefined;
  msBitfields: boolean | undefined;
  unicode: boolean | undefined;
  threads: boolean | undefined;
  dll: boolean | undefined;
  abicalls: boolean | undefined;
};

type TCcPreprocessorOptions = {
  // -D, -U
  macros: readonly TCcMacro[];
  // -I<dir>
  includeDirectories: readonly string[];
  // -iquote <dir>
  quoteIncludeDirectories: readonly string[];
  // -isystem <dir>
  systemIncludeDirectories: readonly string[];
  // -idirafter <dir>
  afterIncludeDirectories: readonly string[];
  // -F<dir>
  frameworkDirectories: readonly string[];
  // -iframework <dir>
  systemFrameworkDirectories: readonly string[];
  // -iprefix <prefix>
  includePrefix: string | undefined;
  // -iwithprefix <dir>
  prefixedIncludeDirectories: readonly string[];
  // -iwithprefixbefore <dir>
  prefixedBeforeIncludeDirectories: readonly string[];
  // -imultilib <dir>
  multilib: string | undefined;
  // -include <file>
  includeFiles: readonly string[];
  // -imacros <file>
  macroFiles: readonly string[];
  // -include-pch <file>
  precompiledHeader: string | undefined;
  // -ivfsoverlay <file>
  vfsOverlays: readonly string[];
  // -A<assertion>
  assertions: readonly string[];
  // -nostdinc
  nostdinc: true | undefined;
  // -nostdinc++
  nostdincxx: true | undefined;
  // -undef
  undef: true | undefined;
  // -P
  noLineMarkers: true | undefined;
  // -H
  printIncludes: true | undefined;
  // -traditional
  traditional: true | undefined;
  // -traditional-cpp
  traditionalCpp: true | undefined;
  // -trigraphs
  trigraphs: true | undefined;
  // -dI
  includeDump: true | undefined;
  // -C, -CC
  comments: "keep" | "keep-in-macros" | undefined;
  // -dM, -dD, -dN, -dU
  macroDump: "definitions" | "definitions-and-output" | "names" | "used" | undefined;

  // -f<name>, -fno-<name>
  directivesOnly: boolean | undefined;
  preprocessed: boolean | undefined;
  workingDirectory: boolean | undefined;
};

type TCcDependencyOptions = {
  // -M, -MM, -MD, -MMD
  generate: true | undefined;
  // -M, -MD instead of -MM, -MMD
  includeSystemHeaderFiles: boolean | undefined;
  // -MD, -MMD, -MF
  file: true | undefined;
  // -MF <file>
  filename: string | undefined;
  // -MT <target>, -MQ <target>
  targets: readonly TCcDependencyTarget[];
  // -MP
  includeMissing: true | undefined;
  // -MG
  missingHeadersAreGenerated: true | undefined;
};

type TCcDebugOptions = {
  // -g
  enable: true | undefined;
  // -g<level>
  level: number | undefined;
  // -ggdb and alike
  format:
    | "gdb"
    | "lldb"
    | "sce"
    | "dbx"
    | "dwarf"
    | "stabs"
    | "stabs+"
    | "xcoff"
    | "xcoff+"
    | "vms"
    | "codeview"
    | "btf"
    | "ctf"
    | undefined;
  // -gdwarf-<version>
  dwarfVersion: number | undefined;
  // -gdwarf32, -gdwarf64
  dwarfFormat: "32" | "64" | undefined;
  // -gz, -gz=<type>
  compression: "none" | "zlib" | "zlib-gnu" | "zstd" | undefined;
  // -gline-tables-only
  lineTablesOnly: true | undefined;
  // -gline-directives-only
  lineDirectivesOnly: true | undefined;

  // -g<name>, -gno-<name>
  splitDwarf: boolean | undefined;
  columnInfo: boolean | undefined;
  pubnames: boolean | undefined;
  gnuPubnames: boolean | undefined;
  strictDwarf: boolean | undefined;
  recordGccSwitches: boolean | undefined;
  recordCommandLine: boolean | undefined;
  embedSource: boolean | undefined;
  inlineLineTables: boolean | undefined;
  statementFrontiers: boolean | undefined;
  variableLocationViews: boolean | undefined;
  asLocSupport: boolean | undefined;
  simpleTemplateNames: boolean | undefined;
  modules: boolean | undefined;
};

type TCcCodeGenerationOptions = {
  // -fpic, -fPIC, -fno-pic
  pic: "small" | "large" | false | undefined;
  // -fpie, -fPIE, -fno-pie
  pie: "small" | "large" | false | undefined;
  // -fvisibility=<visibility>
  visibility: "default" | "hidden" | "protected" | "internal" | undefined;
  // -ftls-model=<model>
  tlsModel: "global-dynamic" | "local-dynamic" | "initial-exec" | "local-exec" | undefined;
  // -flto, -flto=<mode>, -fno-lto
  lto: boolean | string | undefined;
  // -fstack-protector[-<kind>], -fno-stack-protector
  stackProtector: "default" | "strong" | "all" | "explicit" | false | undefined;
  // -fcf-protection[=<kind>]
  controlFlowProtection: "full" | "branch" | "return" | "none" | "check" | undefined;
  // -ftrivial-auto-var-init=<value>
  trivialAutoVarInit: "uninitialized" | "zero" | "pattern" | undefined;
  // -ffp-contract=<mode>
  fpContract: "off" | "on" | "fast" | "fast-honor-pragmas" | undefined;
  // -ffp-model=<model>
  fpModel: "precise" | "strict" | "fast" | undefined;
  // -fexcess-precision=<style>
  excessPrecision: "standard" | "fast" | "16" | undefined;
  // -fzero-call-used-regs=<choice>
  zeroCallUsedRegs: string | undefined;
  // -fpatchable-function-entry=<n>[,<m>]
  patchableFunctionEntry: string | undefined;
  // -frandom-seed=<seed>
  randomSeed: string | undefined;
  // -fstack-check[=<kind>], -fno-stack-check
  stackCheck: boolean | string | undefined;
  // -fstrict-flex-arrays[=<level>]
  strictFlexArrays: boolean | string | undefined;
  // -falign-functions[=<n>]
  alignFunctions: boolean | string | undefined;
  // -falign-jumps[=<n>]
  alignJumps: boolean | string | undefined;
  // -falign-loops[=<n>]
  alignLoops: boolean | string | undefined;
  // -falign-labels[=<n>]
  alignLabels: boolean | string | undefined;
  // -ffixed-<register>
  fixedRegisters: readonly string[];

  // -f<name>, -fno-<name>
  common: boolean | undefined;
  strictAliasing: boolean | undefined;
  strictOverflow: boolean | undefined;
  wrapv: boolean | undefined;
  trapv: boolean | undefined;
  deleteNullPointerChecks: boolean | undefined;
  omitFramePointer: boolean | undefined;
  functionSections: boolean | undefined;
  dataSections: boolean | undefined;
  asynchronousUnwindTables: boolean | undefined;
  unwindTables: boolean | undefined;
  plt: boolean | undefined;
  semanticInterposition: boolean | undefined;
  stackClashProtection: boolean | undefined;
  splitStack: boolean | undefined;
  fastMath: boolean | undefined;
  mathErrno: boolean | undefined;
  finiteMathOnly: boolean | undefined;
  trappingMath: boolean | undefined;
  roundingMath: boolean | undefined;
  signedZeros: boolean | undefined;
  associativeMath: boolean | undefined;
  reciprocalMath: boolean | undefined;
  unsafeMathOptimizations: boolean | undefined;
  inline: boolean | undefined;
  inlineFunctions: boolean | undefined;
  inlineSmallFunctions: boolean | undefined;
  inlineFunctionsCalledOnce: boolean | undefined;
  unrollLoops: boolean | undefined;
  unrollAllLoops: boolean | undefined;
  peelLoops: boolean | undefined;
  vectorize: boolean | undefined;
  slpVectorize: boolean | undefined;
  treeVectorize: boolean | undefined;
  treeLoopVectorize: boolean | undefined;
  treeSlpVectorize: boolean | undefined;
  treeLoopDistributePatterns: boolean | undefined;
  jumpTables: boolean | undefined;
  optimizeSiblingCalls: boolean | undefined;
  toplevelReorder: boolean | undefined;
  reorderFunctions: boolean | undefined;
  reorderBlocks: boolean | undefined;
  mergeConstants: boolean | undefined;
  mergeAllConstants: boolean | undefined;
  zeroInitializedInBss: boolean | undefined;
  keepInlineFunctions: boolean | undefined;
  keepStaticConsts: boolean | undefined;
  ident: boolean | undefined;
  dwarf2CfiAsm: boolean | undefined;
  conserveStack: boolean | undefined;
  stackUsage: boolean | undefined;
  visibilityInlinesHidden: boolean | undefined;
  fatLtoObjects: boolean | undefined;
  useLinkerPlugin: boolean | undefined;
  wholeProgram: boolean | undefined;
  varTracking: boolean | undefined;
  varTrackingAssignments: boolean | undefined;
  ipaSra: boolean | undefined;
  allowStoreDataRaces: boolean | undefined;
  strictVolatileBitfields: boolean | undefined;
  verboseAsm: boolean | undefined;
};

type TCcInstrumentationOptions = {
  // --coverage
  coverage: true | undefined;
  // -pg
  gprof: true | undefined;
  // -p
  prof: true | undefined;
  // -fprofile-generate[=<path>], -fno-profile-generate
  profileGenerate: boolean | string | undefined;
  // -fprofile-use[=<path>], -fno-profile-use
  profileUse: boolean | string | undefined;
  // -fprofile-instr-generate[=<file>]
  profileInstrGenerate: boolean | string | undefined;
  // -fprofile-instr-use[=<file>]
  profileInstrUse: boolean | string | undefined;
  // -fprofile-update=<method>
  profileUpdate: "single" | "atomic" | "prefer-atomic" | undefined;
  // -fsanitize=<names>, -fno-sanitize=<names>
  sanitizers: readonly TCcSanitizerSetting[];
  // -fsanitize-recover[=<names>], -fno-sanitize-recover[=<names>]
  sanitizerRecover: readonly TCcSanitizerSetting[];
  // -fsanitize-trap[=<names>], -fno-sanitize-trap[=<names>]
  sanitizerTrap: readonly TCcSanitizerSetting[];
  // -fsanitize-coverage=<types>
  sanitizerCoverage: readonly string[];
  // -fsanitize-ignorelist=<file>
  sanitizerIgnoreLists: readonly string[];
  // -fsanitize-blacklist=<file>
  sanitizerBlacklists: readonly string[];

  // -f<name>, -fno-<name>
  profileArcs: boolean | undefined;
  testCoverage: boolean | undefined;
  coverageMapping: boolean | undefined;
  instrumentFunctions: boolean | undefined;
};

type TCcDiagnosticsOptions = {
  // -fdiagnostics-color[=<when>], -fcolor-diagnostics and negations
  color: boolean | "always" | "never" | "auto" | undefined;
  // -fdiagnostics-format=<format>
  format: string | undefined;
  // -fmessage-length=<n>
  messageLength: number | undefined;
  // -fmax-errors=<n>
  maxErrors: number | undefined;
  // -ferror-limit=<n>
  errorLimit: number | undefined;
  // -serialize-diagnostics <file>
  serializeFile: string | undefined;

  // -f<name>, -fno-<name>
  showOption: boolean | undefined;
  showCaret: boolean | undefined;
};

type TCcWarningOptions = {
  // -w
  suppressAll: true | undefined;
  // -pedantic-errors
  pedanticErrors: true | undefined;

  // -W<name>, -Wno-<name>
  error: boolean | undefined;
  fatalErrors: boolean | undefined;

  // -W<name>[=<value>], -Wno-<name>, -Werror=<name>, -Wno-error=<name>
  all: TCcWarning | undefined;
  // also -W
  extra: TCcWarning | undefined;
  // also -pedantic
  pedantic: TCcWarning | undefined;
  everything: TCcWarning | undefined;
  address: TCcWarning | undefined;
  addressOfPackedMember: TCcWarning | undefined;
  allocSizeLargerThan: TCcWarning | undefined;
  alloca: TCcWarning | undefined;
  arrayBounds: TCcWarning | undefined;
  arrayParameter: TCcWarning | undefined;
  attributes: TCcWarning | undefined;
  badFunctionCast: TCcWarning | undefined;
  boolConversion: TCcWarning | undefined;
  builtinMacroRedefined: TCcWarning | undefined;
  castAlign: TCcWarning | undefined;
  castFunctionType: TCcWarning | undefined;
  castQual: TCcWarning | undefined;
  charSubscripts: TCcWarning | undefined;
  comma: TCcWarning | undefined;
  comment: TCcWarning | undefined;
  conditionalUninitialized: TCcWarning | undefined;
  constantConversion: TCcWarning | undefined;
  conversion: TCcWarning | undefined;
  danglingPointer: TCcWarning | undefined;
  dateTime: TCcWarning | undefined;
  declarationAfterStatement: TCcWarning | undefined;
  deprecated: TCcWarning | undefined;
  deprecatedDeclarations: TCcWarning | undefined;
  deprecatedNonPrototype: TCcWarning | undefined;
  designatedInit: TCcWarning | undefined;
  documentation: TCcWarning | undefined;
  doublePromotion: TCcWarning | undefined;
  duplicatedBranches: TCcWarning | undefined;
  duplicatedCond: TCcWarning | undefined;
  emptyBody: TCcWarning | undefined;
  enumConversion: TCcWarning | undefined;
  extraSemi: TCcWarning | undefined;
  floatConversion: TCcWarning | undefined;
  floatEqual: TCcWarning | undefined;
  format: TCcWarning | undefined;
  formatNonliteral: TCcWarning | undefined;
  formatOverflow: TCcWarning | undefined;
  formatSecurity: TCcWarning | undefined;
  formatSignedness: TCcWarning | undefined;
  formatTruncation: TCcWarning | undefined;
  frameAddress: TCcWarning | undefined;
  frameLargerThan: TCcWarning | undefined;
  freeNonheapObject: TCcWarning | undefined;
  gnu: TCcWarning | undefined;
  ignoredQualifiers: TCcWarning | undefined;
  implicit: TCcWarning | undefined;
  implicitFallthrough: TCcWarning | undefined;
  implicitFunctionDeclaration: TCcWarning | undefined;
  implicitInt: TCcWarning | undefined;
  incompatibleFunctionPointerTypes: TCcWarning | undefined;
  incompatiblePointerTypes: TCcWarning | undefined;
  infiniteRecursion: TCcWarning | undefined;
  initSelf: TCcWarning | undefined;
  inline: TCcWarning | undefined;
  intConversion: TCcWarning | undefined;
  intToPointerCast: TCcWarning | undefined;
  invalidPch: TCcWarning | undefined;
  jumpMissesInit: TCcWarning | undefined;
  logicalOp: TCcWarning | undefined;
  longLong: TCcWarning | undefined;
  main: TCcWarning | undefined;
  maybeUninitialized: TCcWarning | undefined;
  misleadingIndentation: TCcWarning | undefined;
  missingBraces: TCcWarning | undefined;
  missingDeclarations: TCcWarning | undefined;
  missingFieldInitializers: TCcWarning | undefined;
  missingFormatAttribute: TCcWarning | undefined;
  missingIncludeDirs: TCcWarning | undefined;
  missingNoreturn: TCcWarning | undefined;
  missingProfile: TCcWarning | undefined;
  missingPrototypes: TCcWarning | undefined;
  missingVariableDeclarations: TCcWarning | undefined;
  multichar: TCcWarning | undefined;
  nestedExterns: TCcWarning | undefined;
  newlineEof: TCcWarning | undefined;
  nonLiteralNullConversion: TCcWarning | undefined;
  nonVirtualDtor: TCcWarning | undefined;
  nonnull: TCcWarning | undefined;
  nullDereference: TCcWarning | undefined;
  oldStyleCast: TCcWarning | undefined;
  oldStyleDeclaration: TCcWarning | undefined;
  oldStyleDefinition: TCcWarning | undefined;
  overlengthStrings: TCcWarning | undefined;
  overloadedVirtual: TCcWarning | undefined;
  packed: TCcWarning | undefined;
  packedNotAligned: TCcWarning | undefined;
  padded: TCcWarning | undefined;
  parentheses: TCcWarning | undefined;
  pessimizingMove: TCcWarning | undefined;
  pointerArith: TCcWarning | undefined;
  pointerSign: TCcWarning | undefined;
  redundantDecls: TCcWarning | undefined;
  redundantMove: TCcWarning | undefined;
  restrict: TCcWarning | undefined;
  returnType: TCcWarning | undefined;
  sequencePoint: TCcWarning | undefined;
  shadow: TCcWarning | undefined;
  shiftCountOverflow: TCcWarning | undefined;
  shiftNegativeValue: TCcWarning | undefined;
  shorten64To32: TCcWarning | undefined;
  signCompare: TCcWarning | undefined;
  signConversion: TCcWarning | undefined;
  stackProtector: TCcWarning | undefined;
  stackUsage: TCcWarning | undefined;
  strictAliasing: TCcWarning | undefined;
  strictOverflow: TCcWarning | undefined;
  strictPrototypes: TCcWarning | undefined;
  stringopOverflow: TCcWarning | undefined;
  stringopOverread: TCcWarning | undefined;
  stringopTruncation: TCcWarning | undefined;
  suggestAttribute: TCcWarning | undefined;
  suggestOverride: TCcWarning | undefined;
  switch: TCcWarning | undefined;
  switchDefault: TCcWarning | undefined;
  switchEnum: TCcWarning | undefined;
  systemHeaders: TCcWarning | undefined;
  threadSafety: TCcWarning | undefined;
  trampolines: TCcWarning | undefined;
  trigraphs: TCcWarning | undefined;
  typeLimits: TCcWarning | undefined;
  undef: TCcWarning | undefined;
  uninitialized: TCcWarning | undefined;
  unknownPragmas: TCcWarning | undefined;
  unknownWarningOption: TCcWarning | undefined;
  unreachableCode: TCcWarning | undefined;
  unused: TCcWarning | undefined;
  unusedButSetParameter: TCcWarning | undefined;
  unusedButSetVariable: TCcWarning | undefined;
  unusedCommandLineArgument: TCcWarning | undefined;
  unusedConstVariable: TCcWarning | undefined;
  unusedFunction: TCcWarning | undefined;
  unusedLabel: TCcWarning | undefined;
  unusedLocalTypedefs: TCcWarning | undefined;
  unusedMacros: TCcWarning | undefined;
  unusedParameter: TCcWarning | undefined;
  unusedResult: TCcWarning | undefined;
  unusedValue: TCcWarning | undefined;
  unusedVariable: TCcWarning | undefined;
  useAfterFree: TCcWarning | undefined;
  uselessCast: TCcWarning | undefined;
  vla: TCcWarning | undefined;
  vlaLargerThan: TCcWarning | undefined;
  writeStrings: TCcWarning | undefined;
  zeroAsNullPointerConstant: TCcWarning | undefined;
  zeroLengthBounds: TCcWarning | undefined;
};

type TCcLinkerOptions = {
  // -shared
  shared: true | undefined;
  // -static
  static: true | undefined;
  // -static-pie
  staticPie: true | undefined;
  // -r
  relocatable: true | undefined;
  // -rdynamic
  rdynamic: true | undefined;
  // -s
  strip: true | undefined;
  // -static-libgcc
  staticLibgcc: true | undefined;
  // -shared-libgcc
  sharedLibgcc: true | undefined;
  // -static-libstdc++
  staticLibstdcxx: true | undefined;
  // -static-libsan
  staticLibsan: true | undefined;
  // -nostdlib
  nostdlib: true | undefined;
  // -nostdlib++
  nostdlibxx: true | undefined;
  // -nodefaultlibs
  nodefaultlibs: true | undefined;
  // -nostartfiles
  nostartfiles: true | undefined;
  // -nolibc
  nolibc: true | undefined;
  // -dynamiclib
  dynamicLibrary: true | undefined;
  // -bundle
  bundle: true | undefined;
  // -headerpad_max_install_names
  headerpadMaxInstallNames: true | undefined;
  // -dead_strip
  deadStrip: true | undefined;
  // -flat_namespace
  flatNamespace: true | undefined;
  // -e <symbol>, --entry=<symbol>
  entryPoint: string | undefined;
  // -fuse-ld=<linker>
  useLinker: string | undefined;
  // --ld-path=<path>
  linkerPath: string | undefined;
  // --rtlib=<library>, -rtlib=<library>
  runtimeLibrary: "libgcc" | "compiler-rt" | "platform" | undefined;
  // --unwindlib=<library>, -unwindlib=<library>
  unwindLibrary: "libgcc" | "libunwind" | "platform" | "none" | undefined;
  // -bundle_loader <executable>
  bundleLoader: string | undefined;
  // -install_name <name>
  installName: string | undefined;
  // -compatibility_version <version>
  compatibilityVersion: string | undefined;
  // -current_version <version>
  currentVersion: string | undefined;
  // -undefined <treatment>
  undefinedSymbolTreatment: "error" | "warning" | "suppress" | "dynamic_lookup" | undefined;
  // -exported_symbols_list <file>
  exportedSymbolsList: string | undefined;
  // -L<dir>
  libraryDirectories: readonly string[];
  // -T <script>
  scripts: readonly string[];
  // -u <symbol>
  undefinedSymbols: readonly string[];
  // -z <keyword>
  keywords: readonly string[];
  // -rpath <dir>
  rpaths: readonly string[];

  // -<name>, -no-<name>
  pie: boolean | undefined;
};

// options that have no field of their own, keyed by the option up to the first "=" and holding the rest
// (empty without "="), e.g. -fno-foo -mbar=baz becomes { "-fno-foo": "", "-mbar": "baz" },
// except for -Werror=<name> and -Wno-error=<name>, whose warning name belongs to the key
type TCcUnknownOptions = Record<string, string>;

type TCcOptions = {
  action: TCcAction;
  // -o <file>
  outputFile: string | undefined;
  inputs: readonly TCcInput[];
  queries: readonly TCcQuery[];
  optimization: TCcOptimizationLevel | undefined;
  driver: TCcDriverOptions;
  target: TCcTargetOptions;
  language: TCcLanguageOptions;
  machine: TCcMachineOptions;
  preprocessor: TCcPreprocessorOptions;
  dependencies: TCcDependencyOptions;
  debug: TCcDebugOptions;
  codeGeneration: TCcCodeGenerationOptions;
  instrumentation: TCcInstrumentationOptions;
  diagnostics: TCcDiagnosticsOptions;
  warnings: TCcWarningOptions;
  linker: TCcLinkerOptions;
  prefixMaps: readonly TCcPrefixMap[];
  unknownOptions: TCcUnknownOptions;
};

type TCcOptionGroupName =
  | "driver"
  | "target"
  | "language"
  | "machine"
  | "preprocessor"
  | "dependencies"
  | "debug"
  | "codeGeneration"
  | "instrumentation"
  | "diagnostics"
  | "warnings"
  | "linker";

// every field of a table, set to undefined
const undefinedFields = <TField extends string>({ fields }: { fields: { readonly [field in TField]: unknown } }) => {
  return Object.fromEntries(Object.keys(fields).map((field) => {
    return [field, undefined];
  })) as { [field in TField]: undefined };
};

// options of an empty command line
const defaultOptions: TCcOptions = {
  action: "link",
  outputFile: undefined,
  inputs: [],
  queries: [],
  optimization: undefined,
  driver: {
    verbose: undefined,
    dryRun: undefined,
    pipe: undefined,
    pthread: undefined,
    emitLlvm: undefined,
    noCanonicalPrefixes: undefined,
    suppressUnusedArgumentWarnings: undefined,
    integratedAssembler: undefined,
    saveTemps: undefined,
    workingDirectory: undefined,
    compilationDatabaseFile: undefined,
    indexStorePath: undefined,
    toolchainPrefixes: [],
    specs: [],
    plugins: [],
    clangArguments: [],
    llvmArguments: [],
    assemblerArguments: [],
    preprocessorArguments: [],
    parameters: [],
    architectureArguments: [],
  },
  target: {
    triple: undefined,
    sysroot: undefined,
    headerSysroot: undefined,
    gccToolchain: undefined,
    resourceDirectory: undefined,
    architectures: [],
    appleDeploymentTarget: undefined,
  },
  language: {
    ...undefinedFields({ fields: languageToggles.names }),
    standard: undefined,
    ansi: undefined,
    cxxStandardLibrary: undefined,
    charSignedness: undefined,
    environment: undefined,
    openmp: undefined,
    inputCharset: undefined,
    execCharset: undefined,
    wideExecCharset: undefined,
    templateDepth: undefined,
    constexprDepth: undefined,
    disabledBuiltins: [],
    moduleName: undefined,
    modulesCachePath: undefined,
    moduleMapFiles: [],
    moduleFiles: [],
    prebuiltModulePaths: [],
  },
  machine: {
    ...undefinedFields({ fields: machineToggles.names }),
    architecture: undefined,
    tune: undefined,
    cpu: undefined,
    fpu: undefined,
    abi: undefined,
    codeModel: undefined,
    floatAbi: undefined,
    branchProtection: undefined,
    indirectBranch: undefined,
    functionReturn: undefined,
    tlsDialect: undefined,
    fpmath: undefined,
    asmDialect: undefined,
    stackProtectorGuard: undefined,
    stackProtectorGuardRegister: undefined,
    stackProtectorGuardOffset: undefined,
    preferredStackBoundary: undefined,
    incomingStackBoundary: undefined,
    regparm: undefined,
    smallDataThreshold: undefined,
    wordSize: undefined,
    instructionSet: undefined,
    endianness: undefined,
    floatingPoint: undefined,
    subsystem: undefined,
  },
  preprocessor: {
    macros: [],
    includeDirectories: [],
    quoteIncludeDirectories: [],
    systemIncludeDirectories: [],
    afterIncludeDirectories: [],
    frameworkDirectories: [],
    systemFrameworkDirectories: [],
    includePrefix: undefined,
    prefixedIncludeDirectories: [],
    prefixedBeforeIncludeDirectories: [],
    multilib: undefined,
    includeFiles: [],
    macroFiles: [],
    precompiledHeader: undefined,
    vfsOverlays: [],
    assertions: [],
    nostdinc: undefined,
    nostdincxx: undefined,
    undef: undefined,
    noLineMarkers: undefined,
    printIncludes: undefined,
    traditional: undefined,
    traditionalCpp: undefined,
    trigraphs: undefined,
    includeDump: undefined,
    comments: undefined,
    macroDump: undefined,
    directivesOnly: undefined,
    preprocessed: undefined,
    workingDirectory: undefined,
  },
  dependencies: {
    generate: undefined,
    includeSystemHeaderFiles: undefined,
    file: undefined,
    filename: undefined,
    targets: [],
    includeMissing: undefined,
    missingHeadersAreGenerated: undefined,
  },
  debug: {
    ...undefinedFields({ fields: debugToggles.names }),
    enable: undefined,
    level: undefined,
    format: undefined,
    dwarfVersion: undefined,
    dwarfFormat: undefined,
    compression: undefined,
    lineTablesOnly: undefined,
    lineDirectivesOnly: undefined,
  },
  codeGeneration: {
    ...undefinedFields({ fields: codeGenerationToggles.names }),
    pic: undefined,
    pie: undefined,
    visibility: undefined,
    tlsModel: undefined,
    lto: undefined,
    stackProtector: undefined,
    controlFlowProtection: undefined,
    trivialAutoVarInit: undefined,
    fpContract: undefined,
    fpModel: undefined,
    excessPrecision: undefined,
    zeroCallUsedRegs: undefined,
    patchableFunctionEntry: undefined,
    randomSeed: undefined,
    stackCheck: undefined,
    strictFlexArrays: undefined,
    alignFunctions: undefined,
    alignJumps: undefined,
    alignLoops: undefined,
    alignLabels: undefined,
    fixedRegisters: [],
  },
  instrumentation: {
    coverage: undefined,
    gprof: undefined,
    prof: undefined,
    profileGenerate: undefined,
    profileUse: undefined,
    profileInstrGenerate: undefined,
    profileInstrUse: undefined,
    profileUpdate: undefined,
    sanitizers: [],
    sanitizerRecover: [],
    sanitizerTrap: [],
    sanitizerCoverage: [],
    sanitizerIgnoreLists: [],
    sanitizerBlacklists: [],
    profileArcs: undefined,
    testCoverage: undefined,
    coverageMapping: undefined,
    instrumentFunctions: undefined,
  },
  diagnostics: {
    color: undefined,
    format: undefined,
    messageLength: undefined,
    maxErrors: undefined,
    errorLimit: undefined,
    serializeFile: undefined,
    showOption: undefined,
    showCaret: undefined,
  },
  warnings: {
    ...undefinedFields({ fields: namedWarnings }),
    suppressAll: undefined,
    pedanticErrors: undefined,
    error: undefined,
    fatalErrors: undefined,
  },
  linker: {
    ...undefinedFields({ fields: linkerToggles.names }),
    shared: undefined,
    static: undefined,
    staticPie: undefined,
    relocatable: undefined,
    rdynamic: undefined,
    strip: undefined,
    staticLibgcc: undefined,
    sharedLibgcc: undefined,
    staticLibstdcxx: undefined,
    staticLibsan: undefined,
    nostdlib: undefined,
    nostdlibxx: undefined,
    nodefaultlibs: undefined,
    nostartfiles: undefined,
    nolibc: undefined,
    dynamicLibrary: undefined,
    bundle: undefined,
    headerpadMaxInstallNames: undefined,
    deadStrip: undefined,
    flatNamespace: undefined,
    entryPoint: undefined,
    useLinker: undefined,
    linkerPath: undefined,
    runtimeLibrary: undefined,
    unwindLibrary: undefined,
    bundleLoader: undefined,
    installName: undefined,
    compatibilityVersion: undefined,
    currentVersion: undefined,
    undefinedSymbolTreatment: undefined,
    exportedSymbolsList: undefined,
    libraryDirectories: [],
    scripts: [],
    undefinedSymbols: [],
    keywords: [],
    rpaths: [],
  },
  prefixMaps: [],
  unknownOptions: {},
};

export {
  defaultOptions
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
};
