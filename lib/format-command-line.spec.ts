import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { formatCommandLine } from "./format-command-line.ts";
import { groupDescriptors } from "./option-descriptors.ts";
import { defaultOptions } from "./options.ts";
import { parseCommandLine } from "./parse-command-line.ts";
import {
  argsFor,
  splitLine,
  withGroup
} from "./test-helpers.spec.ts";
import type { TCcOptions } from "./options.ts";

// parsing the formatted options again gives the same options
const assertRoundTrip = ({ args }: { args: readonly string[] }) => {
  const options = parseCommandLine({ args });

  assert.deepEqual(parseCommandLine({ args: formatCommandLine({ options }) }), options, args.join(" "));
};

const formatLine = ({ line }: { line: string }) => {
  return formatCommandLine({ options: parseCommandLine({ args: splitLine({ line }) }) });
};

describe("formatCommandLine", () => {
  it("should format an empty command line", () => {
    assert.deepEqual(formatCommandLine({ options: defaultOptions }), []);
  });

  describe("described options", () => {
    groupDescriptors.forEach((descriptor) => {
      it(`should format the options of ${descriptor.group}`, () => {
        const { prefix } = descriptor.toggles;

        [
          ...Object.values(descriptor.flags),
          ...Object.values(descriptor.toggles.names).flatMap((name) => {
            return [`${prefix}${name}`, `${prefix}no-${name}`];
          }),
          ...descriptor.choices.flatMap(({ choices }) => {
            return choices.map(({ option }) => {
              return option;
            });
          }),
          ...descriptor.valuedToggles.flatMap((entry) => {
            const value = entry.values === undefined ? "value" : entry.values[0];

            return [`${entry.prefix}${entry.name}`, `${entry.prefix}no-${entry.name}`, `${entry.prefix}${entry.name}=${value}`];
          }),
        ].forEach((option) => {
          assertRoundTrip({ args: [option] });
        });

        [
          ...descriptor.enums.map(({ option, syntax, values }) => {
            return argsFor({ option, syntax, value: values[0] });
          }),
          ...[...descriptor.strings, ...descriptor.lists].map(({ option, syntax }) => {
            return argsFor({ option, syntax, value: "value" });
          }),
          ...descriptor.numbers.map(({ option, syntax }) => {
            return argsFor({ option, syntax, value: "7" });
          }),
        ].forEach((args) => {
          assertRoundTrip({ args });
        });
      });
    });

    it("should write values in their first spelling", () => {
      assert.deepEqual(formatLine({ line: "-target x86_64-linux-gnu --sysroot /sysroot -isysroot/sdk -I include -Tlink.ld" }), [
        "--target=x86_64-linux-gnu",
        "--sysroot=/sysroot",
        "-isysroot",
        "/sdk",
        "-Iinclude",
        "-Tlink.ld",
      ]);
    });

    it("should write the first option of a choice", () => {
      assert.deepEqual(formatLine({ line: "-fno-PIC -fno-signed-char" }), ["-funsigned-char", "-fno-pic"]);
    });

    it("should reject a value no choice stands for", () => {
      const options = withGroup({ group: "machine", values: { wordSize: "128" as "64" } });

      assert.throws(() => {
        formatCommandLine({ options });
      }, { message: "unsupported value 128 for wordSize" });
    });
  });

  describe("action, queries and optimization", () => {
    [
      { action: "preprocess", option: "-E" },
      { action: "analyze", option: "--analyze" },
      { action: "check-syntax", option: "-fsyntax-only" },
      { action: "generate-assembly", option: "-S" },
      { action: "compile", option: "-c" },
    ].forEach(({ action, option }) => {
      it(`should format ${option}`, () => {
        assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, action } as TCcOptions }), [option]);
      });
    });

    it("should format queries", () => {
      assert.deepEqual(formatLine({ line: "-print-prog-name=ld -dumpversion" }), ["-print-prog-name=ld", "-dumpversion"]);
    });

    it("should format optimization levels", () => {
      assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, optimization: 3 } }), ["-O3"]);
      assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, optimization: "min-size" } }), ["-Oz"]);
    });

    it("should format prefix maps", () => {
      assert.deepEqual(formatLine({ line: "-ffile-prefix-map=/a=/b -fprofile-prefix-map=/c=" }), [
        "-ffile-prefix-map=/a=/b",
        "-fprofile-prefix-map=/c=",
      ]);
    });
  });

  describe("inputs", () => {
    it("should give input files their language", () => {
      assert.deepEqual(formatLine({ line: "a.c -x c++ b.cc -lfoo c.cc -x none d.c" }), [
        "a.c",
        "-x",
        "c++",
        "b.cc",
        "-lfoo",
        "c.cc",
        "-x",
        "none",
        "d.c",
      ]);
    });

    it("should keep libraries, frameworks, linker arguments and response files in order", () => {
      const line = "-Wl,--start-group -la -lb -Wl,--end-group main.o -framework Cocoa -weak_framework Metal @objects.rsp";

      assert.deepEqual(formatLine({ line }), splitLine({ line }));
    });

    it("should pass linker arguments containing a comma with -Xlinker", () => {
      assert.deepEqual(formatLine({ line: "-Xlinker --defsym=a=b,c -Xlinker -rpath" }), [
        "-Xlinker",
        "--defsym=a=b,c",
        "-Wl,-rpath",
      ]);
    });

    it("should format the output file last", () => {
      assert.deepEqual(formatLine({ line: "-o a.out -c a.c" }), ["-c", "a.c", "-o", "a.out"]);
    });
  });

  describe("driver and target", () => {
    it("should format arguments passed on to other tools", () => {
      const line = "-Wa,--noexecstack -Xassembler -I,x -Wp,-MD,a.d --param max-inline-insns=10 -Xarch_arm64 -mcpu=apple-m1";

      assert.deepEqual(formatLine({ line }), [
        "-Xassembler",
        "--noexecstack",
        "-Xassembler",
        "-I,x",
        "-Wp,-MD,a.d",
        "--param",
        "max-inline-insns=10",
        "-Xarch_arm64",
        "-mcpu=apple-m1",
      ]);
    });

    it("should format apple deployment targets", () => {
      assert.deepEqual(formatLine({ line: "-mmacosx-version-min=10.13" }), ["-mmacosx-version-min=10.13"]);
    });
  });

  describe("debug and instrumentation", () => {
    it("should format the debug level apart from the format", () => {
      assert.deepEqual(formatLine({ line: "-ggdb3" }), ["-ggdb", "-g3"]);
    });

    it("should format sanitizers in order, sharing options between neighbours", () => {
      const line = "-fno-sanitize=vptr -fsanitize=address -fsanitize=undefined -fno-sanitize-recover -fsanitize-trap=integer";

      assert.deepEqual(formatLine({ line }), [
        "-fno-sanitize=vptr",
        "-fsanitize=address,undefined",
        "-fno-sanitize-recover=all",
        "-fsanitize-trap=integer",
      ]);
    });

    it("should format sanitizer coverage", () => {
      assert.deepEqual(formatLine({ line: "-fsanitize-coverage=trace-pc -fsanitize-coverage=trace-cmp" }), [
        "-fsanitize-coverage=trace-pc,trace-cmp",
      ]);
    });
  });

  describe("warnings", () => {
    it("should format named warnings", () => {
      const line = "-Wformat=2 -Wno-unused -Werror=switch -Wno-error=shadow -Wall -Werror=all";

      assert.deepEqual(formatLine({ line }), ["-Wall", "-Werror=all", "-Wformat=2", "-Wno-error=shadow", "-Werror=switch", "-Wno-unused"]);
    });

    it("should format -W and -pedantic in their -W<name> spelling", () => {
      assert.deepEqual(formatLine({ line: "-W -pedantic" }), ["-Wextra", "-Wpedantic"]);
    });
  });

  describe("preprocessor and dependencies", () => {
    it("should format macros in order", () => {
      assert.deepEqual(formatLine({ line: "-DA -DB=1 -DC= -UA" }), ["-DA", "-DB=1", "-DC=", "-UA"]);
    });

    it("should format dependency info", () => {
      assert.deepEqual(formatLine({ line: "-M" }), ["-E", "-M"]);
      assert.deepEqual(formatLine({ line: "-MM" }), ["-E", "-MM"]);
      assert.deepEqual(formatLine({ line: "-MD -MP -MT a.o -MQ b.o -MF a.d" }), ["-MP", "-MD", "-MT", "a.o", "-MQ", "b.o", "-MF", "a.d"]);
      assert.deepEqual(formatLine({ line: "-MMD" }), ["-MMD"]);
    });

    it("should reject dependency info without a file when not preprocessing", () => {
      const options = withGroup({ group: "dependencies", values: { generate: true } });

      assert.throws(() => {
        formatCommandLine({ options: { ...options, action: "compile" } });
      }, { message: "non-file dependency info requested but action is not preprocess" });
    });

    it("should reject a dependency filename when file output is not enabled", () => {
      assert.throws(() => {
        formatCommandLine({ options: withGroup({ group: "dependencies", values: { filename: "a.d" } }) });
      }, { message: "filename given but file output not enabled" });
    });
  });

  describe("unknown options", () => {
    it("should format them with their value", () => {
      assert.deepEqual(formatLine({ line: "-fnew-thing -mfoo=bar=baz -Werror=new" }), ["-fnew-thing", "-mfoo=bar=baz", "-Werror=new"]);
    });
  });
});
