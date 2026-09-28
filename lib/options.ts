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
    // the -x in effect, none after -x none
    language?: TCcLanguage;
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
    value?: string;
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
  enabled?: boolean;
  error?: boolean;
  value?: string;
};

type TCcDriverOptions = {
  // -v
  verbose?: true;
  // -###
  dryRun?: true;
  // -pipe
  pipe?: true;
  // -pthread
  pthread?: true;
  // -emit-llvm
  emitLlvm?: true;
  // -no-canonical-prefixes
  noCanonicalPrefixes?: true;
  // -Qunused-arguments
  suppressUnusedArgumentWarnings?: true;
  // -fintegrated-as, -fno-integrated-as, -integrated-as, -no-integrated-as
  integratedAssembler?: boolean;
  // -save-temps, -save-temps=<where>
  saveTemps?: "cwd" | "obj";
  // -working-directory <dir>
  workingDirectory?: string;
  // -MJ <file>
  compilationDatabaseFile?: string;
  // -index-store-path <dir>
  indexStorePath?: string;
  // -B<prefix>
  toolchainPrefixes?: readonly string[];
  // -specs=<file>, --specs=<file>
  specs?: readonly string[];
  // -fplugin=<file>
  plugins?: readonly string[];
  // -Xclang <argument>
  clangArguments?: readonly string[];
  // -mllvm <argument>
  llvmArguments?: readonly string[];
  // -Wa,<arguments>, -Xassembler <argument>
  assemblerArguments?: readonly string[];
  // -Wp,<arguments>, -Xpreprocessor <argument>
  preprocessorArguments?: readonly string[];
  // --param <name>=<value>, --param=<name>=<value>
  parameters?: readonly TCcParameter[];
  // -Xarch_<architecture> <argument>
  architectureArguments?: readonly TCcArchitectureArgument[];
};

type TCcTargetOptions = {
  // --target=<triple>, -target <triple>
  triple?: string;
  // --sysroot=<dir>, --sysroot <dir>
  sysroot?: string;
  // -isysroot <dir>
  headerSysroot?: string;
  // --gcc-toolchain=<dir>, -gcc-toolchain <dir>
  gccToolchain?: string;
  // -resource-dir <dir>
  resourceDirectory?: string;
  // -arch <architecture>
  architectures?: readonly string[];
  // -mmacosx-version-min=<version> and alike
  appleDeploymentTarget?: TCcAppleDeploymentTarget;
};

type TCcLanguageOptions = {
  // -std=<standard>, --std=<standard>, --std <standard>
  standard?: string;
  // -ansi
  ansi?: true;
  // -stdlib=<library>
  cxxStandardLibrary?: "libc++" | "libstdc++" | "platform";
  // -fsigned-char, -funsigned-char
  charSignedness?: "signed" | "unsigned";
  // -fhosted, -ffreestanding
  environment?: "hosted" | "freestanding";
  // -fopenmp, -fopenmp=<runtime>, -fno-openmp
  openmp?: boolean | string;
  // -finput-charset=<charset>
  inputCharset?: string;
  // -fexec-charset=<charset>
  execCharset?: string;
  // -fwide-exec-charset=<charset>
  wideExecCharset?: string;
  // -ftemplate-depth=<depth>
  templateDepth?: number;
  // -fconstexpr-depth=<depth>
  constexprDepth?: number;
  // -fno-builtin-<function>
  disabledBuiltins?: readonly string[];
  // -fmodule-name=<name>
  moduleName?: string;
  // -fmodules-cache-path=<dir>
  modulesCachePath?: string;
  // -fmodule-map-file=<file>
  moduleMapFiles?: readonly string[];
  // -fmodule-file=[<name>=]<file>
  moduleFiles?: readonly string[];
  // -fprebuilt-module-path=<dir>
  prebuiltModulePaths?: readonly string[];

  // -f<name>, -fno-<name>
  builtin?: boolean;
  exceptions?: boolean;
  cxxExceptions?: boolean;
  rtti?: boolean;
  threadsafeStatics?: boolean;
  permissive?: boolean;
  msExtensions?: boolean;
  msCompatibility?: boolean;
  declspec?: boolean;
  gnu89Inline?: boolean;
  gnuKeywords?: boolean;
  asm?: boolean;
  blocks?: boolean;
  objcArc?: boolean;
  modules?: boolean;
  coroutines?: boolean;
  shortEnums?: boolean;
  shortWchar?: boolean;
  dollarsInIdentifiers?: boolean;
  signedBitfields?: boolean;
  sizedDeallocation?: boolean;
  char8T?: boolean;
  strictEnums?: boolean;
  delayedTemplateParsing?: boolean;
};

type TCcMachineOptions = {
  // -march=<architecture>
  architecture?: string;
  // -mtune=<cpu>
  tune?: string;
  // -mcpu=<cpu>
  cpu?: string;
  // -mfpu=<fpu>
  fpu?: string;
  // -mabi=<abi>
  abi?: string;
  // -mcmodel=<model>
  codeModel?: string;
  // -mfloat-abi=<abi>
  floatAbi?: "soft" | "softfp" | "hard";
  // -mbranch-protection=<protection>
  branchProtection?: string;
  // -mindirect-branch=<choice>
  indirectBranch?: string;
  // -mfunction-return=<choice>
  functionReturn?: string;
  // -mtls-dialect=<dialect>
  tlsDialect?: string;
  // -mfpmath=<unit>
  fpmath?: string;
  // -masm=<dialect>
  asmDialect?: "att" | "intel";
  // -mstack-protector-guard=<guard>
  stackProtectorGuard?: string;
  // -mstack-protector-guard-reg=<register>
  stackProtectorGuardRegister?: string;
  // -mstack-protector-guard-offset=<offset>
  stackProtectorGuardOffset?: string;
  // -mpreferred-stack-boundary=<n>
  preferredStackBoundary?: number;
  // -mincoming-stack-boundary=<n>
  incomingStackBoundary?: number;
  // -mregparm=<n>
  regparm?: number;
  // -G<n>, -G <n>
  smallDataThreshold?: number;
  // -m16, -m32, -m64, -mx32
  wordSize?: "16" | "32" | "64" | "x32";
  // -marm, -mthumb
  instructionSet?: "arm" | "thumb";
  // -mlittle-endian, -mbig-endian
  endianness?: "little" | "big";
  // -msoft-float, -mhard-float
  floatingPoint?: "soft" | "hard";
  // -mconsole, -mwindows
  subsystem?: "console" | "windows";

  // -m<name>, -mno-<name>
  mmx?: boolean;
  sse?: boolean;
  sse2?: boolean;
  sse3?: boolean;
  ssse3?: boolean;
  sse41?: boolean;
  sse42?: boolean;
  avx?: boolean;
  avx2?: boolean;
  avx512f?: boolean;
  fma?: boolean;
  f16c?: boolean;
  bmi?: boolean;
  bmi2?: boolean;
  popcnt?: boolean;
  lzcnt?: boolean;
  aes?: boolean;
  pclmul?: boolean;
  rdrnd?: boolean;
  movbe?: boolean;
  cx16?: boolean;
  x87?: boolean;
  amd3dnow?: boolean;
  redZone?: boolean;
  fpRetIn387?: boolean;
  generalRegsOnly?: boolean;
  omitLeafFramePointer?: boolean;
  stackrealign?: boolean;
  fentry?: boolean;
  recordMcount?: boolean;
  nopMcount?: boolean;
  retpoline?: boolean;
  indirectBranchRegister?: boolean;
  skipRaxSetup?: boolean;
  unalignedAccess?: boolean;
  strictAlign?: boolean;
  outlineAtomics?: boolean;
  longCalls?: boolean;
  relax?: boolean;
  msBitfields?: boolean;
  unicode?: boolean;
  threads?: boolean;
  dll?: boolean;
  abicalls?: boolean;
};

type TCcPreprocessorOptions = {
  // -D, -U
  macros?: readonly TCcMacro[];
  // -I<dir>
  includeDirectories?: readonly string[];
  // -iquote <dir>
  quoteIncludeDirectories?: readonly string[];
  // -isystem <dir>
  systemIncludeDirectories?: readonly string[];
  // -idirafter <dir>
  afterIncludeDirectories?: readonly string[];
  // -F<dir>
  frameworkDirectories?: readonly string[];
  // -iframework <dir>
  systemFrameworkDirectories?: readonly string[];
  // -iprefix <prefix>
  includePrefix?: string;
  // -iwithprefix <dir>
  prefixedIncludeDirectories?: readonly string[];
  // -iwithprefixbefore <dir>
  prefixedBeforeIncludeDirectories?: readonly string[];
  // -imultilib <dir>
  multilib?: string;
  // -include <file>
  includeFiles?: readonly string[];
  // -imacros <file>
  macroFiles?: readonly string[];
  // -include-pch <file>
  precompiledHeader?: string;
  // -ivfsoverlay <file>
  vfsOverlays?: readonly string[];
  // -A<assertion>
  assertions?: readonly string[];
  // -nostdinc
  nostdinc?: true;
  // -nostdinc++
  nostdincxx?: true;
  // -undef
  undef?: true;
  // -P
  noLineMarkers?: true;
  // -H
  printIncludes?: true;
  // -traditional
  traditional?: true;
  // -traditional-cpp
  traditionalCpp?: true;
  // -trigraphs
  trigraphs?: true;
  // -dI
  includeDump?: true;
  // -C, -CC
  comments?: "keep" | "keep-in-macros";
  // -dM, -dD, -dN, -dU
  macroDump?: "definitions" | "definitions-and-output" | "names" | "used";

  // -f<name>, -fno-<name>
  directivesOnly?: boolean;
  preprocessed?: boolean;
  workingDirectory?: boolean;
};

type TCcDependencyOptions = {
  // -M, -MM, -MD, -MMD
  generate?: true;
  // -M, -MD instead of -MM, -MMD
  includeSystemHeaderFiles?: boolean;
  // -MD, -MMD, -MF
  file?: true;
  // -MF <file>
  filename?: string;
  // -MT <target>, -MQ <target>
  targets?: readonly TCcDependencyTarget[];
  // -MP
  includeMissing?: true;
  // -MG
  missingHeadersAreGenerated?: true;
};

type TCcDebugOptions = {
  // -g
  enable?: true;
  // -g<level>
  level?: number;
  // -ggdb and alike
  format?:
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
    | "ctf";
  // -gdwarf-<version>
  dwarfVersion?: number;
  // -gdwarf32, -gdwarf64
  dwarfFormat?: "32" | "64";
  // -gz, -gz=<type>
  compression?: "none" | "zlib" | "zlib-gnu" | "zstd";
  // -gline-tables-only
  lineTablesOnly?: true;
  // -gline-directives-only
  lineDirectivesOnly?: true;

  // -g<name>, -gno-<name>
  splitDwarf?: boolean;
  columnInfo?: boolean;
  pubnames?: boolean;
  gnuPubnames?: boolean;
  strictDwarf?: boolean;
  recordGccSwitches?: boolean;
  recordCommandLine?: boolean;
  embedSource?: boolean;
  inlineLineTables?: boolean;
  statementFrontiers?: boolean;
  variableLocationViews?: boolean;
  asLocSupport?: boolean;
  simpleTemplateNames?: boolean;
  modules?: boolean;
};

type TCcCodeGenerationOptions = {
  // -fpic, -fPIC, -fno-pic
  pic?: "small" | "large" | false;
  // -fpie, -fPIE, -fno-pie
  pie?: "small" | "large" | false;
  // -fvisibility=<visibility>
  visibility?: "default" | "hidden" | "protected" | "internal";
  // -ftls-model=<model>
  tlsModel?: "global-dynamic" | "local-dynamic" | "initial-exec" | "local-exec";
  // -flto, -flto=<mode>, -fno-lto
  lto?: boolean | string;
  // -fstack-protector[-<kind>], -fno-stack-protector
  stackProtector?: "default" | "strong" | "all" | "explicit" | false;
  // -fcf-protection[=<kind>]
  controlFlowProtection?: "full" | "branch" | "return" | "none" | "check";
  // -ftrivial-auto-var-init=<value>
  trivialAutoVarInit?: "uninitialized" | "zero" | "pattern";
  // -ffp-contract=<mode>
  fpContract?: "off" | "on" | "fast" | "fast-honor-pragmas";
  // -ffp-model=<model>
  fpModel?: "precise" | "strict" | "fast";
  // -fexcess-precision=<style>
  excessPrecision?: "standard" | "fast" | "16";
  // -fzero-call-used-regs=<choice>
  zeroCallUsedRegs?: string;
  // -fpatchable-function-entry=<n>[,<m>]
  patchableFunctionEntry?: string;
  // -frandom-seed=<seed>
  randomSeed?: string;
  // -fstack-check[=<kind>], -fno-stack-check
  stackCheck?: boolean | string;
  // -fstrict-flex-arrays[=<level>]
  strictFlexArrays?: boolean | string;
  // -falign-functions[=<n>]
  alignFunctions?: boolean | string;
  // -falign-jumps[=<n>]
  alignJumps?: boolean | string;
  // -falign-loops[=<n>]
  alignLoops?: boolean | string;
  // -falign-labels[=<n>]
  alignLabels?: boolean | string;
  // -ffixed-<register>
  fixedRegisters?: readonly string[];

  // -f<name>, -fno-<name>
  common?: boolean;
  strictAliasing?: boolean;
  strictOverflow?: boolean;
  wrapv?: boolean;
  trapv?: boolean;
  deleteNullPointerChecks?: boolean;
  omitFramePointer?: boolean;
  functionSections?: boolean;
  dataSections?: boolean;
  asynchronousUnwindTables?: boolean;
  unwindTables?: boolean;
  plt?: boolean;
  semanticInterposition?: boolean;
  stackClashProtection?: boolean;
  splitStack?: boolean;
  fastMath?: boolean;
  mathErrno?: boolean;
  finiteMathOnly?: boolean;
  trappingMath?: boolean;
  roundingMath?: boolean;
  signedZeros?: boolean;
  associativeMath?: boolean;
  reciprocalMath?: boolean;
  unsafeMathOptimizations?: boolean;
  inline?: boolean;
  inlineFunctions?: boolean;
  inlineSmallFunctions?: boolean;
  inlineFunctionsCalledOnce?: boolean;
  unrollLoops?: boolean;
  unrollAllLoops?: boolean;
  peelLoops?: boolean;
  vectorize?: boolean;
  slpVectorize?: boolean;
  treeVectorize?: boolean;
  treeLoopVectorize?: boolean;
  treeSlpVectorize?: boolean;
  treeLoopDistributePatterns?: boolean;
  jumpTables?: boolean;
  optimizeSiblingCalls?: boolean;
  toplevelReorder?: boolean;
  reorderFunctions?: boolean;
  reorderBlocks?: boolean;
  mergeConstants?: boolean;
  mergeAllConstants?: boolean;
  zeroInitializedInBss?: boolean;
  keepInlineFunctions?: boolean;
  keepStaticConsts?: boolean;
  ident?: boolean;
  dwarf2CfiAsm?: boolean;
  conserveStack?: boolean;
  stackUsage?: boolean;
  visibilityInlinesHidden?: boolean;
  fatLtoObjects?: boolean;
  useLinkerPlugin?: boolean;
  wholeProgram?: boolean;
  varTracking?: boolean;
  varTrackingAssignments?: boolean;
  ipaSra?: boolean;
  allowStoreDataRaces?: boolean;
  strictVolatileBitfields?: boolean;
  verboseAsm?: boolean;
};

type TCcInstrumentationOptions = {
  // --coverage
  coverage?: true;
  // -pg
  gprof?: true;
  // -p
  prof?: true;
  // -fprofile-generate[=<path>], -fno-profile-generate
  profileGenerate?: boolean | string;
  // -fprofile-use[=<path>], -fno-profile-use
  profileUse?: boolean | string;
  // -fprofile-instr-generate[=<file>]
  profileInstrGenerate?: boolean | string;
  // -fprofile-instr-use[=<file>]
  profileInstrUse?: boolean | string;
  // -fprofile-update=<method>
  profileUpdate?: "single" | "atomic" | "prefer-atomic";
  // -fsanitize=<names>, -fno-sanitize=<names>
  sanitizers?: readonly TCcSanitizerSetting[];
  // -fsanitize-recover[=<names>], -fno-sanitize-recover[=<names>]
  sanitizerRecover?: readonly TCcSanitizerSetting[];
  // -fsanitize-trap[=<names>], -fno-sanitize-trap[=<names>]
  sanitizerTrap?: readonly TCcSanitizerSetting[];
  // -fsanitize-coverage=<types>
  sanitizerCoverage?: readonly string[];
  // -fsanitize-ignorelist=<file>
  sanitizerIgnoreLists?: readonly string[];
  // -fsanitize-blacklist=<file>
  sanitizerBlacklists?: readonly string[];

  // -f<name>, -fno-<name>
  profileArcs?: boolean;
  testCoverage?: boolean;
  coverageMapping?: boolean;
  instrumentFunctions?: boolean;
};

type TCcDiagnosticsOptions = {
  // -fdiagnostics-color[=<when>], -fcolor-diagnostics and negations
  color?: boolean | "always" | "never" | "auto";
  // -fdiagnostics-format=<format>
  format?: string;
  // -fmessage-length=<n>
  messageLength?: number;
  // -fmax-errors=<n>
  maxErrors?: number;
  // -ferror-limit=<n>
  errorLimit?: number;
  // -serialize-diagnostics <file>
  serializeFile?: string;

  // -f<name>, -fno-<name>
  showOption?: boolean;
  showCaret?: boolean;
};

type TCcWarningOptions = {
  // -w
  suppressAll?: true;
  // -pedantic-errors
  pedanticErrors?: true;

  // -W<name>, -Wno-<name>
  error?: boolean;
  fatalErrors?: boolean;

  // -W<name>[=<value>], -Wno-<name>, -Werror=<name>, -Wno-error=<name>
  all?: TCcWarning;
  // also -W
  extra?: TCcWarning;
  // also -pedantic
  pedantic?: TCcWarning;
  everything?: TCcWarning;
  address?: TCcWarning;
  addressOfPackedMember?: TCcWarning;
  allocSizeLargerThan?: TCcWarning;
  alloca?: TCcWarning;
  arrayBounds?: TCcWarning;
  arrayParameter?: TCcWarning;
  attributes?: TCcWarning;
  badFunctionCast?: TCcWarning;
  boolConversion?: TCcWarning;
  builtinMacroRedefined?: TCcWarning;
  castAlign?: TCcWarning;
  castFunctionType?: TCcWarning;
  castQual?: TCcWarning;
  charSubscripts?: TCcWarning;
  comma?: TCcWarning;
  comment?: TCcWarning;
  conditionalUninitialized?: TCcWarning;
  constantConversion?: TCcWarning;
  conversion?: TCcWarning;
  danglingPointer?: TCcWarning;
  dateTime?: TCcWarning;
  declarationAfterStatement?: TCcWarning;
  deprecated?: TCcWarning;
  deprecatedDeclarations?: TCcWarning;
  deprecatedNonPrototype?: TCcWarning;
  designatedInit?: TCcWarning;
  documentation?: TCcWarning;
  doublePromotion?: TCcWarning;
  duplicatedBranches?: TCcWarning;
  duplicatedCond?: TCcWarning;
  emptyBody?: TCcWarning;
  enumConversion?: TCcWarning;
  extraSemi?: TCcWarning;
  floatConversion?: TCcWarning;
  floatEqual?: TCcWarning;
  format?: TCcWarning;
  formatNonliteral?: TCcWarning;
  formatOverflow?: TCcWarning;
  formatSecurity?: TCcWarning;
  formatSignedness?: TCcWarning;
  formatTruncation?: TCcWarning;
  frameAddress?: TCcWarning;
  frameLargerThan?: TCcWarning;
  freeNonheapObject?: TCcWarning;
  gnu?: TCcWarning;
  ignoredQualifiers?: TCcWarning;
  implicit?: TCcWarning;
  implicitFallthrough?: TCcWarning;
  implicitFunctionDeclaration?: TCcWarning;
  implicitInt?: TCcWarning;
  incompatibleFunctionPointerTypes?: TCcWarning;
  incompatiblePointerTypes?: TCcWarning;
  infiniteRecursion?: TCcWarning;
  initSelf?: TCcWarning;
  inline?: TCcWarning;
  intConversion?: TCcWarning;
  intToPointerCast?: TCcWarning;
  invalidPch?: TCcWarning;
  jumpMissesInit?: TCcWarning;
  logicalOp?: TCcWarning;
  longLong?: TCcWarning;
  main?: TCcWarning;
  maybeUninitialized?: TCcWarning;
  misleadingIndentation?: TCcWarning;
  missingBraces?: TCcWarning;
  missingDeclarations?: TCcWarning;
  missingFieldInitializers?: TCcWarning;
  missingFormatAttribute?: TCcWarning;
  missingIncludeDirs?: TCcWarning;
  missingNoreturn?: TCcWarning;
  missingProfile?: TCcWarning;
  missingPrototypes?: TCcWarning;
  missingVariableDeclarations?: TCcWarning;
  multichar?: TCcWarning;
  nestedExterns?: TCcWarning;
  newlineEof?: TCcWarning;
  nonLiteralNullConversion?: TCcWarning;
  nonVirtualDtor?: TCcWarning;
  nonnull?: TCcWarning;
  nullDereference?: TCcWarning;
  oldStyleCast?: TCcWarning;
  oldStyleDeclaration?: TCcWarning;
  oldStyleDefinition?: TCcWarning;
  overlengthStrings?: TCcWarning;
  overloadedVirtual?: TCcWarning;
  packed?: TCcWarning;
  packedNotAligned?: TCcWarning;
  padded?: TCcWarning;
  parentheses?: TCcWarning;
  pessimizingMove?: TCcWarning;
  pointerArith?: TCcWarning;
  pointerSign?: TCcWarning;
  redundantDecls?: TCcWarning;
  redundantMove?: TCcWarning;
  restrict?: TCcWarning;
  returnType?: TCcWarning;
  sequencePoint?: TCcWarning;
  shadow?: TCcWarning;
  shiftCountOverflow?: TCcWarning;
  shiftNegativeValue?: TCcWarning;
  shorten64To32?: TCcWarning;
  signCompare?: TCcWarning;
  signConversion?: TCcWarning;
  stackProtector?: TCcWarning;
  stackUsage?: TCcWarning;
  strictAliasing?: TCcWarning;
  strictOverflow?: TCcWarning;
  strictPrototypes?: TCcWarning;
  stringopOverflow?: TCcWarning;
  stringopOverread?: TCcWarning;
  stringopTruncation?: TCcWarning;
  suggestAttribute?: TCcWarning;
  suggestOverride?: TCcWarning;
  switch?: TCcWarning;
  switchDefault?: TCcWarning;
  switchEnum?: TCcWarning;
  systemHeaders?: TCcWarning;
  threadSafety?: TCcWarning;
  trampolines?: TCcWarning;
  trigraphs?: TCcWarning;
  typeLimits?: TCcWarning;
  undef?: TCcWarning;
  uninitialized?: TCcWarning;
  unknownPragmas?: TCcWarning;
  unknownWarningOption?: TCcWarning;
  unreachableCode?: TCcWarning;
  unused?: TCcWarning;
  unusedButSetParameter?: TCcWarning;
  unusedButSetVariable?: TCcWarning;
  unusedCommandLineArgument?: TCcWarning;
  unusedConstVariable?: TCcWarning;
  unusedFunction?: TCcWarning;
  unusedLabel?: TCcWarning;
  unusedLocalTypedefs?: TCcWarning;
  unusedMacros?: TCcWarning;
  unusedParameter?: TCcWarning;
  unusedResult?: TCcWarning;
  unusedValue?: TCcWarning;
  unusedVariable?: TCcWarning;
  useAfterFree?: TCcWarning;
  uselessCast?: TCcWarning;
  vla?: TCcWarning;
  vlaLargerThan?: TCcWarning;
  writeStrings?: TCcWarning;
  zeroAsNullPointerConstant?: TCcWarning;
  zeroLengthBounds?: TCcWarning;
};

type TCcLinkerOptions = {
  // -shared
  shared?: true;
  // -static
  static?: true;
  // -static-pie
  staticPie?: true;
  // -r
  relocatable?: true;
  // -rdynamic
  rdynamic?: true;
  // -s
  strip?: true;
  // -static-libgcc
  staticLibgcc?: true;
  // -shared-libgcc
  sharedLibgcc?: true;
  // -static-libstdc++
  staticLibstdcxx?: true;
  // -static-libsan
  staticLibsan?: true;
  // -nostdlib
  nostdlib?: true;
  // -nostdlib++
  nostdlibxx?: true;
  // -nodefaultlibs
  nodefaultlibs?: true;
  // -nostartfiles
  nostartfiles?: true;
  // -nolibc
  nolibc?: true;
  // -dynamiclib
  dynamicLibrary?: true;
  // -bundle
  bundle?: true;
  // -headerpad_max_install_names
  headerpadMaxInstallNames?: true;
  // -dead_strip
  deadStrip?: true;
  // -flat_namespace
  flatNamespace?: true;
  // -e <symbol>, --entry=<symbol>
  entryPoint?: string;
  // -fuse-ld=<linker>
  useLinker?: string;
  // --ld-path=<path>
  linkerPath?: string;
  // --rtlib=<library>, -rtlib=<library>
  runtimeLibrary?: "libgcc" | "compiler-rt" | "platform";
  // --unwindlib=<library>, -unwindlib=<library>
  unwindLibrary?: "libgcc" | "libunwind" | "platform" | "none";
  // -bundle_loader <executable>
  bundleLoader?: string;
  // -install_name <name>
  installName?: string;
  // -compatibility_version <version>
  compatibilityVersion?: string;
  // -current_version <version>
  currentVersion?: string;
  // -undefined <treatment>
  undefinedSymbolTreatment?: "error" | "warning" | "suppress" | "dynamic_lookup";
  // -exported_symbols_list <file>
  exportedSymbolsList?: string;
  // -L<dir>
  libraryDirectories?: readonly string[];
  // -T <script>
  scripts?: readonly string[];
  // -u <symbol>
  undefinedSymbols?: readonly string[];
  // -z <keyword>
  keywords?: readonly string[];
  // -rpath <dir>
  rpaths?: readonly string[];

  // -<name>, -no-<name>
  pie?: boolean;
};

// options that have no field of their own, keyed by the option up to the first "=" and holding the rest
// (empty without "="), e.g. -fno-foo -mbar=baz becomes { "-fno-foo": "", "-mbar": "baz" },
// except for -Werror=<name> and -Wno-error=<name>, whose warning name belongs to the key
type TCcUnknownOptions = Record<string, string>;

type TCcOptions = {
  action: TCcAction;
  // -o <file>
  outputFile?: string;
  inputs?: readonly TCcInput[];
  queries?: readonly TCcQuery[];
  optimization?: TCcOptimizationLevel;
  driver?: TCcDriverOptions;
  target?: TCcTargetOptions;
  language?: TCcLanguageOptions;
  machine?: TCcMachineOptions;
  preprocessor?: TCcPreprocessorOptions;
  dependencies?: TCcDependencyOptions;
  debug?: TCcDebugOptions;
  codeGeneration?: TCcCodeGenerationOptions;
  instrumentation?: TCcInstrumentationOptions;
  diagnostics?: TCcDiagnosticsOptions;
  warnings?: TCcWarningOptions;
  linker?: TCcLinkerOptions;
  prefixMaps?: readonly TCcPrefixMap[];
  unknownOptions?: TCcUnknownOptions;
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

// options of an empty command line
const defaultOptions: TCcOptions = {
  action: "link",
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
