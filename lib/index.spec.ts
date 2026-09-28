import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { createCompilerCommandLineParser } from "./index.ts";

// compiler calls of build systems, toolchains and compiler detection, one argument per word
const fieldCommandLines: readonly { name: string; line: string }[] = [
  {
    name: "autotools libtool compile",
    line: [
      "-DHAVE_CONFIG_H -I. -I.. -I../include -Wall -g -O2 -MT foo.lo -MD -MP -MF .deps/foo.Tpo -c foo.c -fPIC -DPIC",
      "-o .libs/foo.o",
    ].join(" "),
  },
  {
    name: "autotools libtool link",
    line: "-shared -fPIC -DPIC .libs/foo.o .libs/bar.o -lm -g -O2 -Wl,-soname -Wl,libfoo.so.1 -o .libs/libfoo.so.1.0.0",
  },
  { name: "autoconf probe link", line: "-o conftest -g -O2 conftest.c -lpthread" },
  { name: "autoconf probe preprocess", line: "-E -traditional-cpp conftest.c" },
  {
    name: "cmake compile",
    line: [
      "-DFOO_EXPORTS -I/src/include -isystem /usr/include/glib-2.0 -O3 -DNDEBUG -std=gnu11 -fPIC -MD -MT",
      "CMakeFiles/foo.dir/foo.c.o -MF CMakeFiles/foo.dir/foo.c.o.d -o CMakeFiles/foo.dir/foo.c.o -c /src/foo.c",
    ].join(" "),
  },
  {
    name: "cmake link",
    line: [
      "-O3 -DNDEBUG -rdynamic CMakeFiles/app.dir/main.cpp.o -o app -Wl,-rpath,/build/lib libfoo.so -lpthread -ldl",
      "@CMakeFiles/app.dir/objects1.rsp",
    ].join(" "),
  },
  {
    name: "meson compile",
    line: [
      "-Ilibfoo.so.p -I. -I.. -fdiagnostics-color=always -D_FILE_OFFSET_BITS=64 -Wall -Winvalid-pch -Wextra -std=c11",
      "-O2 -g -fPIC -MD -MQ libfoo.so.p/foo.c.o -MF libfoo.so.p/foo.c.o.d -o libfoo.so.p/foo.c.o -c ../foo.c",
    ].join(" "),
  },
  {
    name: "meson link",
    line: [
      "-o libfoo.so libfoo.so.p/foo.c.o -Wl,--as-needed -Wl,--no-undefined -shared -fPIC -Wl,--start-group",
      "-Wl,-soname,libfoo.so -lm -Wl,--end-group",
    ].join(" "),
  },
  {
    name: "linux kernel compile",
    line: [
      "-Wp,-MMD,drivers/foo/.bar.o.d -nostdinc -I./arch/x86/include -I./arch/x86/include/generated -I./include",
      "-include ./include/linux/compiler-version.h -include ./include/linux/kconfig.h -D__KERNEL__",
      "-fmacro-prefix-map=./= -Wall -Wundef -Werror=strict-prototypes -Wno-trigraphs -fno-strict-aliasing -fno-common",
      "-fshort-wchar -fno-PIE -Werror=implicit-function-declaration -Werror=implicit-int -Werror=return-type",
      "-Wno-format-security -std=gnu11 -mno-sse -mno-mmx -mno-sse2 -mno-3dnow -mno-avx -fcf-protection=none -m64",
      "-falign-jumps=1 -falign-loops=1 -mno-80387 -mno-fp-ret-in-387 -mpreferred-stack-boundary=3 -mskip-rax-setup",
      "-mtune=generic -mno-red-zone -mcmodel=kernel -Wno-sign-compare -fno-asynchronous-unwind-tables",
      "-mindirect-branch=thunk-extern -mindirect-branch-register -mfunction-return=thunk-extern -fno-jump-tables",
      "-fno-delete-null-pointer-checks -O2 -fno-allow-store-data-races -fstack-protector-strong",
      "-fno-omit-frame-pointer -fno-optimize-sibling-calls -ftrivial-auto-var-init=zero -fno-stack-clash-protection",
      "-pg -mrecord-mcount -mfentry -DCC_USING_FENTRY -falign-functions=16 -fstrict-flex-arrays=3",
      "-fno-strict-overflow -fstack-check=no -fconserve-stack -Wno-pointer-sign -Wcast-function-type",
      "-Wno-stringop-truncation -Wno-zero-length-bounds -Wno-array-bounds -Wno-stringop-overflow -Wno-restrict",
      "-Wno-maybe-uninitialized -Wno-alloc-size-larger-than -Wimplicit-fallthrough=5 -Werror=date-time",
      "-Werror=incompatible-pointer-types -Werror=designated-init -Wenum-conversion -Wno-unused-but-set-variable",
      "-Wno-unused-const-variable -Wno-packed-not-aligned -Wno-format-overflow -Wno-format-truncation -g -gdwarf-5",
      "-DKBUILD_MODFILE=\"drivers/foo/bar\" -DKBUILD_BASENAME=\"bar\" -DKBUILD_MODNAME=\"bar\" -D__KBUILD_MODNAME=kmod_bar",
      "-c -o drivers/foo/bar.o drivers/foo/bar.c",
    ].join(" "),
  },
  {
    name: "linux kernel linker script",
    line: "-E -P -C -x c -D__ASSEMBLY__ -DLINKER_SCRIPT -Iinclude -o vmlinux.lds vmlinux.lds.S",
  },
  {
    name: "arm64 kernel",
    line: "-mbranch-protection=standard -mgeneral-regs-only -mno-outline-atomics -ffixed-x18 -mabi=lp64 -c -o a.o a.c",
  },
  {
    name: "android ndk",
    line: [
      "--target=aarch64-none-linux-android21 --sysroot=/ndk/sysroot -DANDROID -fdata-sections -ffunction-sections",
      "-funwind-tables -fstack-protector-strong -no-canonical-prefixes -D_FORTIFY_SOURCE=2 -Wformat",
      "-Werror=format-security -fexceptions -frtti -stdlib=libc++ -O3 -DNDEBUG -fPIC -std=gnu++17 -MD -MT x.o -MF",
      "x.o.d -o x.o -c x.cpp",
    ].join(" "),
  },
  {
    name: "xcode compile",
    line: [
      "-x objective-c -target arm64-apple-macos11.0 -fmessage-length=0 -std=gnu11 -fobjc-arc -fmodules -gmodules",
      "-fmodules-cache-path=/cache -Wno-trigraphs -O0 -fno-common -Wno-missing-field-initializers",
      "-Wno-missing-prototypes -Werror=return-type -Wdocumentation -Wunreachable-code -Wno-missing-braces",
      "-Wparentheses -Wswitch -Wunused-function -Wno-unused-label -Wno-unused-parameter -Wunused-variable",
      "-Wunused-value -Wempty-body -Wuninitialized -Wconditional-uninitialized -Wno-unknown-pragmas -Wno-shadow",
      "-Wno-conversion -Wconstant-conversion -Wint-conversion -Wbool-conversion -Wenum-conversion",
      "-Wno-float-conversion -Wnon-literal-null-conversion -Wshorten-64-to-32 -Wpointer-sign -Wno-newline-eof",
      "-DDEBUG=1 -isysroot /SDKs/MacOSX.sdk -fstrict-aliasing -Wdeprecated-declarations -mmacosx-version-min=11.0 -g",
      "-Wno-sign-conversion -Winfinite-recursion -Wcomma -Wstrict-prototypes -index-store-path",
      "/DerivedData/Index/DataStore -iquote /x/include -I/x/include -F/x/Frameworks -MMD -MT dependencies -MF",
      "/x/foo.d --serialize-diagnostics /x/foo.dia -c /src/foo.m -o /x/foo.o",
    ].join(" "),
  },
  {
    name: "macos dylib link",
    line: [
      "-dynamiclib -install_name @rpath/libfoo.dylib -compatibility_version 1.0.0 -current_version 1.2.3",
      "-Wl,-headerpad_max_install_names -arch x86_64 -arch arm64 -isysroot /SDK -mmacosx-version-min=10.13 -framework",
      "CoreFoundation -weak_framework Security -o libfoo.dylib foo.o -undefined dynamic_lookup",
    ].join(" "),
  },
  { name: "macos universal", line: "-arch x86_64 -arch arm64 -Xarch_x86_64 -msse4.2 -c a.c" },
  {
    name: "go cgo",
    line: [
      "-I . -fPIC -m64 -pthread -fmessage-length=0 -fdebug-prefix-map=/tmp/b001=/tmp/go-build",
      "-gno-record-gcc-switches -I /tmp/b001/ -O2 -g -Wall -Werror -o /tmp/b001/_x001.o -c _cgo_export.c",
    ].join(" "),
  },
  {
    name: "rust cc crate",
    line: [
      "-O0 -ffunction-sections -fdata-sections -fPIC -g -fno-omit-frame-pointer -m64 -Wall -Wextra -o /out/foo.o -c",
      "src/foo.c",
    ].join(" "),
  },
  {
    name: "python extension",
    line: [
      "-Wno-unused-result -Wsign-compare -DNDEBUG -g -fwrapv -O2 -Wall -fstack-protector-strong -Wformat",
      "-Werror=format-security -fPIC -I/usr/include/python3.12 -c foo.c -o build/foo.o",
    ].join(" "),
  },
  {
    name: "node-gyp",
    line: [
      "-o Release/obj.target/addon/addon.o ../addon.cc -DNODE_GYP_MODULE_NAME=addon -DUSING_UV_SHARED=1",
      "-D_LARGEFILE_SOURCE -I/home/u/.cache/node-gyp/20/include/node -fPIC -pthread -Wall -Wextra",
      "-Wno-unused-parameter -m64 -O3 -fno-omit-frame-pointer -fno-rtti -fno-exceptions -std=gnu++17 -MMD -MF",
      "./Release/.deps/addon.o.d.raw -c",
    ].join(" "),
  },
  {
    name: "bazel",
    line: [
      "-U_FORTIFY_SOURCE -fstack-protector -Wall -Wunused-but-set-parameter -Wno-free-nonheap-object",
      "-fno-omit-frame-pointer -g0 -O2 -D_FORTIFY_SOURCE=1 -DNDEBUG -ffunction-sections -fdata-sections -std=c++14",
      "-MD -MF out/foo.pic.d -frandom-seed=out/foo.pic.o -fPIC -iquote . -iquote out/bin -Wno-builtin-macro-redefined",
      "-D__DATE__=\"redacted\" -c foo.cc -o out/foo.pic.o",
    ].join(" "),
  },
  {
    name: "embedded arm",
    line: [
      "-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard -Os -ffunction-sections -fdata-sections -Wall",
      "-std=gnu11 -g3 -DSTM32F407xx -IInc -specs=nano.specs -specs=nosys.specs -T STM32F407VGTx_FLASH.ld",
      "-Wl,-Map=out.map,--cref -Wl,--gc-sections -static -Wl,--start-group -lc -lm -Wl,--end-group -o out.elf main.o",
      "startup.o",
    ].join(" "),
  },
  {
    name: "riscv",
    line: [
      "-march=rv64gc -mabi=lp64d -mcmodel=medany -mno-relax -ffreestanding -nostdlib -Wl,-e,_start -o kernel.elf",
      "start.o main.o -lgcc",
    ].join(" "),
  },
  { name: "mips", line: "-G 0 -mno-abicalls -fno-pic -msoft-float -c a.c" },
  {
    name: "mingw",
    line: [
      "-mwindows -municode -static-libgcc -static-libstdc++ -Wl,--subsystem,windows -o app.exe main.o -lgdi32",
      "-luser32",
    ].join(" "),
  },
  { name: "i686", line: "-m32 -march=i686 -msse2 -mfpmath=sse -c a.c" },
  { name: "compiler macros", line: "-x c -E -dM /dev/null" },
  { name: "compiler macros from stdin", line: "-E -dM -" },
  { name: "compiler version", line: "--version" },
  { name: "compiler verbose", line: "-v" },
  { name: "compiler dump version", line: "-dumpfullversion -dumpversion" },
  { name: "compiler machine", line: "-dumpmachine" },
  { name: "compiler search dirs", line: "-print-search-dirs" },
  { name: "compiler libgcc", line: "-print-libgcc-file-name" },
  { name: "compiler file name", line: "-print-file-name=libgcc.a" },
  { name: "compiler prog name", line: "-print-prog-name=ld" },
  { name: "clang resource dir", line: "-print-resource-dir" },
  { name: "compiler dry run", line: "-### -x c /dev/null" },
  { name: "linker version", line: "-Wl,--version" },
  {
    name: "sanitizers and fuzzing",
    line: [
      "-fsanitize=address,undefined -fno-omit-frame-pointer -fno-sanitize-recover=all",
      "-fsanitize-coverage=trace-pc-guard,trace-cmp -g -O1 -o fuzz fuzz.c -fsanitize=fuzzer",
    ].join(" "),
  },
  { name: "gcc lto", line: "-flto=auto -ffat-lto-objects -fuse-linker-plugin -O2 -o app a.o b.o" },
  { name: "clang thin lto", line: "-flto=thin -fuse-ld=lld -Wl,--thinlto-jobs=8 -o app a.o b.o" },
  { name: "gcov", line: "--coverage -fprofile-arcs -ftest-coverage -O0 -g a.c -o a" },
  { name: "clang coverage", line: "-fprofile-instr-generate -fcoverage-mapping -o a a.c" },
  { name: "pgo", line: "-fprofile-use=/tmp/pgo -Wno-missing-profile -fprofile-update=atomic -O2 -c a.c" },
  { name: "reproducible", line: "-ffile-prefix-map=/build/src=. -fdebug-prefix-map=/build=/usr/src -c a.c" },
  { name: "clang plugin", line: "-Xclang -load -Xclang plugin.so -mllvm -inline-threshold=1000 -c a.c" },
  {
    name: "assembler",
    line: "-c -x assembler-with-cpp -D__ASSEMBLY__ -Wa,--noexecstack -Wa,-march=armv8-a+crypto start.S -o start.o",
  },
  { name: "save temps", line: "-save-temps=obj -c a.c" },
  { name: "openmp", line: "-fopenmp -O2 a.c -o a -lgomp" },
  { name: "clang openmp", line: "-fopenmp=libomp -c a.c" },
  { name: "c++ modules", line: "-std=c++20 -fmodule-file=foo=foo.pcm -fprebuilt-module-path=. -c main.cpp" },
  { name: "precompiled header", line: "-include-pch pch.h.pch -c a.c" },
  { name: "compilation database", line: "-MJ a.o.json -c a.c -o a.o" },
  { name: "hardening", line: "-shared -Wl,-z,defs -Wl,-z,relro -Wl,-z,now -z noexecstack -o libx.so x.o" },
  { name: "static pie", line: "-static-pie -o a a.o" },
  {
    name: "strict c",
    line: "-std=c99 -pedantic -Wall -Wextra -Wconversion -Wshadow -Werror -Wno-error=deprecated-declarations -c a.c",
  },
  {
    name: "glibc style",
    line: "-Wstrict-prototypes -Wold-style-definition -fmath-errno -fno-stack-protector -ftls-model=initial-exec -c a.c",
  },
  { name: "check syntax", line: "-fsyntax-only -Wall a.c" },
  { name: "assembly", line: "-S -O2 -fverbose-asm -masm=intel a.c -o a.s" },
];

describe("createCompilerCommandLineParser", () => {
  const parser = createCompilerCommandLineParser();

  describe("compiler calls out in the field", () => {
    fieldCommandLines.forEach(({ name, line }) => {
      it(`should understand every option of the ${name} call`, () => {
        const options = parser.parseCommandLine({ args: line.split(" ") });

        assert.equal(options.unknownOptions, undefined);
        assert.deepEqual(parser.parseCommandLine({ args: parser.formatCommandLine({ options }) }), options);
      });
    });
  });

  [
    "-c -O2 -g -Wall a.c -o a.o",
    "-shared foo.o -Wl,--as-needed -lm -o libfoo.so",
    "-E -dM -x c /dev/null",
    "-Wl,--whole-archive -lfoo -Wl,--no-whole-archive main.o -lbar",
  ].forEach((line) => {
    it(`should format "${line}" as given`, () => {
      const args = line.split(" ");

      assert.deepEqual(parser.formatCommandLine({ options: parser.parseCommandLine({ args }) }), args);
    });
  });
});
