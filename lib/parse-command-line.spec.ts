import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { groupDescriptors, namedWarnings } from "./option-descriptors.ts";
import { defaultOptions } from "./options.ts";
import { optionSpecs, parseCommandLine } from "./parse-command-line.ts";
import {
  argsFor,
  splitLine,
  withField,
  withGroup
} from "./test-helpers.spec.ts";
import type { TCcOptionGroupName } from "./options.ts";

const parseLine = ({ line }: { line: string }) => {
  return parseCommandLine({ args: splitLine({ line }) });
};

// fields that are not described by the group descriptors
const customFields: { readonly [group in TCcOptionGroupName]: readonly string[] } = {
  driver: ["assemblerArguments", "preprocessorArguments", "parameters", "architectureArguments"],
  target: ["appleDeploymentTarget"],
  language: [],
  machine: [],
  preprocessor: ["macros"],
  dependencies: ["generate", "includeSystemHeaderFiles", "file", "filename", "targets"],
  debug: ["level"],
  codeGeneration: [],
  instrumentation: ["sanitizers", "sanitizerRecover", "sanitizerTrap", "sanitizerCoverage"],
  diagnostics: [],
  warnings: Object.keys(namedWarnings),
  linker: [],
};

describe("parseCommandLine", () => {
  describe("operands", () => {
    it("should parse an empty command line", () => {
      assert.deepEqual(parseCommandLine({ args: [] }), defaultOptions);
    });

    it("should collect input files with the language of the last -x", () => {
      assert.deepEqual(parseLine({ line: "a.c -x c++ b.cc -xc c.h -x none d.c" }).inputs, [
        { kind: "file", path: "a.c", language: undefined },
        { kind: "file", path: "b.cc", language: "c++" },
        { kind: "file", path: "c.h", language: "c" },
        { kind: "file", path: "d.c", language: undefined },
      ]);
    });

    it("should read - as standard input and keep response files", () => {
      assert.deepEqual(parseLine({ line: "- @args.rsp" }).inputs, [
        { kind: "file", path: "-", language: undefined },
        { kind: "response-file", path: "args.rsp" },
      ]);
    });

    it("should treat arguments named like object properties as input files", () => {
      assert.deepEqual(parseLine({ line: "toString constructor" }).inputs, [
        { kind: "file", path: "toString", language: undefined },
        { kind: "file", path: "constructor", language: undefined },
      ]);
    });

    it("should keep libraries, frameworks and linker arguments in command line order", () => {
      const line = "-Wl,--whole-archive -lfoo -Wl,--no-whole-archive -l bar -framework Cocoa -weak_framework Metal -Xlinker -rpath";

      assert.deepEqual(parseLine({ line }).inputs, [
        { kind: "linker-arguments", args: ["--whole-archive"] },
        { kind: "library", name: "foo" },
        { kind: "linker-arguments", args: ["--no-whole-archive"] },
        { kind: "library", name: "bar" },
        { kind: "framework", name: "Cocoa", weak: false },
        { kind: "framework", name: "Metal", weak: true },
        { kind: "linker-arguments", args: ["-rpath"] },
      ]);
    });

    it("should reject an unknown language", () => {
      assert.throws(() => {
        parseLine({ line: "-x klingon a.k" });
      }, { message: `invalid value "klingon" for option -x` });
    });
  });

  describe("action", () => {
    [
      { line: "-E", action: "preprocess" },
      { line: "--analyze", action: "analyze" },
      { line: "-fsyntax-only", action: "check-syntax" },
      { line: "-S", action: "generate-assembly" },
      { line: "-c", action: "compile" },
    ].forEach(({ line, action }) => {
      it(`should parse ${line}`, () => {
        assert.deepEqual(parseLine({ line }), { ...defaultOptions, action });
      });
    });

    it("should use the earliest stage given", () => {
      assert.equal(parseLine({ line: "-c -E" }).action, "preprocess");
      assert.equal(parseLine({ line: "-E -c" }).action, "preprocess");
    });
  });

  describe("output, queries and optimization", () => {
    it("should parse the output file", () => {
      assert.equal(parseLine({ line: "-o a.out" }).outputFile, "a.out");
      assert.equal(parseLine({ line: "-oa.out" }).outputFile, "a.out");
    });

    it("should parse queries in order", () => {
      assert.deepEqual(parseLine({ line: "--version -dumpmachine -print-file-name=libgcc.a -print-prog-name=ld" }).queries, [
        { kind: "version" },
        { kind: "dump-machine" },
        { kind: "print-file-name", name: "libgcc.a" },
        { kind: "print-prog-name", name: "ld" },
      ]);
    });

    [
      { line: "-O", optimization: "default" },
      { line: "-O2", optimization: 2 },
      { line: "-Os", optimization: "size" },
      { line: "-Oz", optimization: "min-size" },
      { line: "-Ofast", optimization: "fast" },
      { line: "-Og", optimization: "debug" },
      { line: "-O3 -Os", optimization: "size" },
    ].forEach(({ line, optimization }) => {
      it(`should parse the optimization of ${line}`, () => {
        assert.deepEqual(parseLine({ line }), { ...defaultOptions, optimization });
      });
    });

    it("should reject an unknown optimization", () => {
      assert.throws(() => {
        parseLine({ line: "-Oextreme" });
      }, { message: `invalid value "extreme" for option -O` });
    });

    it("should parse prefix maps", () => {
      assert.deepEqual(parseLine({ line: "-fdebug-prefix-map=/a=/b -fmacro-prefix-map=./=" }).prefixMaps, [
        { kind: "debug", from: "/a", to: "/b" },
        { kind: "macro", from: "./", to: "" },
      ]);
    });

    it("should reject a prefix map without =", () => {
      assert.throws(() => {
        parseLine({ line: "-ffile-prefix-map=/a" });
      }, { message: `invalid value "/a" for option -ffile-prefix-map=` });
    });
  });

  describe("described options", () => {
    groupDescriptors.forEach((descriptor) => {
      const { group } = descriptor;

      it(`should parse the flags, toggles and choices of ${group}`, () => {
        Object.entries(descriptor.flags).forEach(([field, option]) => {
          assert.deepEqual(parseCommandLine({ args: [option] }), withField({ group, field, value: true }));
        });

        Object.entries(descriptor.toggles.names).forEach(([field, name]) => {
          const { prefix } = descriptor.toggles;

          assert.deepEqual(parseCommandLine({ args: [`${prefix}${name}`] }), withField({ group, field, value: true }));
          assert.deepEqual(parseCommandLine({ args: [`${prefix}no-${name}`] }), withField({ group, field, value: false }));
        });

        descriptor.choices.forEach(({ field, choices }) => {
          choices.forEach(({ option, value }) => {
            assert.deepEqual(parseCommandLine({ args: [option] }), withField({ group, field, value }));
          });
        });
      });

      it(`should parse the values of ${group}`, () => {
        [
          ...descriptor.strings.map((entry) => {
            return { entry, value: "value", parsed: "value" };
          }),
          ...descriptor.numbers.map((entry) => {
            return { entry, value: "7", parsed: 7 };
          }),
          ...descriptor.lists.map((entry) => {
            return { entry, value: "value", parsed: ["value"] };
          }),
        ].forEach(({ entry, value, parsed }) => {
          [entry, ...entry.aliases].forEach(({ option, syntax }) => {
            const args = argsFor({ option, syntax, value });

            assert.deepEqual(parseCommandLine({ args }), withField({ group, field: entry.field, value: parsed }));
          });
        });
      });

      it(`should parse the enums of ${group}`, () => {
        descriptor.enums.forEach((entry) => {
          [entry, ...entry.aliases].forEach(({ option, syntax }) => {
            entry.values.forEach((value) => {
              const args = argsFor({ option, syntax, value });

              assert.deepEqual(parseCommandLine({ args }), withField({ group, field: entry.field, value }));
            });
          });
        });

        descriptor.enums.filter(({ bareValue }) => {
          return bareValue !== undefined;
        }).forEach(({ field, option, bareValue }) => {
          const args = [option.slice(0, -"=".length)];

          assert.deepEqual(parseCommandLine({ args }), withField({ group, field, value: bareValue }));
        });
      });

      it(`should parse the valued toggles of ${group}`, () => {
        descriptor.valuedToggles.forEach(({ field, prefix, name, values, aliases }) => {
          const value = values === undefined ? "value" : values[0];

          assert.deepEqual(parseCommandLine({ args: [`${prefix}${name}`] }), withField({ group, field, value: true }));
          assert.deepEqual(parseCommandLine({ args: [`${prefix}no-${name}`] }), withField({ group, field, value: false }));
          assert.deepEqual(parseCommandLine({ args: [`${prefix}${name}=${value}`] }), withField({ group, field, value }));

          aliases.forEach((alias) => {
            assert.deepEqual(parseCommandLine({ args: [alias.option] }), withField({ group, field, value: alias.value }));
          });
        });
      });

      it(`should reject invalid values of ${group}`, () => {
        [...descriptor.strings, ...descriptor.lists].forEach(({ option, syntax }) => {
          assert.throws(() => {
            parseCommandLine({ args: argsFor({ option, syntax, value: "" }) });
          }, { message: `missing value for option ${option}` });
        });

        [...descriptor.numbers, ...descriptor.enums].forEach(({ option, syntax }) => {
          assert.throws(() => {
            parseCommandLine({ args: argsFor({ option, syntax, value: "bogus" }) });
          }, { message: `invalid value "bogus" for option ${option}` });
        });

        descriptor.valuedToggles.forEach(({ prefix, name, values }) => {
          const option = `${prefix}${name}=`;
          const value = values === undefined ? "" : "bogus";
          const message = values === undefined ? `missing value for option ${option}` : `invalid value "bogus" for option ${option}`;

          assert.throws(() => {
            parseCommandLine({ args: [`${option}${value}`] });
          }, { message });
        });
      });
    });

    it("should parse values given in both ways", () => {
      assert.deepEqual(parseLine({ line: "-I include -isystem/usr/include" }), withGroup({
        group: "preprocessor",
        values: { includeDirectories: ["include"], systemIncludeDirectories: ["/usr/include"] },
      }));
    });

    it("should append to lists in order", () => {
      assert.deepEqual(parseLine({ line: "-Ib -Ia -Ib" }).preprocessor.includeDirectories, ["b", "a", "b"]);
    });
  });

  describe("preprocessor", () => {
    it("should parse macro definitions in order", () => {
      assert.deepEqual(parseLine({ line: "-DA -D B=1 -DC= -DD=e=f -UA" }).preprocessor.macros, [
        { kind: "define", name: "A", value: undefined },
        { kind: "define", name: "B", value: "1" },
        { kind: "define", name: "C", value: "" },
        { kind: "define", name: "D", value: "e=f" },
        { kind: "undefine", name: "A" },
      ]);
    });

    it("should parse arguments of the preprocessor and assembler", () => {
      assert.deepEqual(parseLine({ line: "-Wp,-MD,a.d -Xpreprocessor -P -Wa,--noexecstack -Xassembler -g" }), withGroup({
        group: "driver",
        values: { preprocessorArguments: ["-MD", "a.d", "-P"], assemblerArguments: ["--noexecstack", "-g"] },
      }));
    });
  });

  describe("dependencies", () => {
    it("should preprocess and generate dependency info with -M and -MM", () => {
      assert.deepEqual(parseLine({ line: "-M" }), {
        ...withGroup({ group: "dependencies", values: { generate: true, includeSystemHeaderFiles: true } }),
        action: "preprocess",
      });
      assert.deepEqual(parseLine({ line: "-MM" }), {
        ...withGroup({ group: "dependencies", values: { generate: true, includeSystemHeaderFiles: false } }),
        action: "preprocess",
      });
    });

    it("should generate dependency files with -MD and -MMD", () => {
      assert.deepEqual(parseLine({ line: "-MD" }), withGroup({
        group: "dependencies",
        values: { generate: true, includeSystemHeaderFiles: true, file: true },
      }));
      assert.deepEqual(parseLine({ line: "-MMD" }), withGroup({
        group: "dependencies",
        values: { generate: true, includeSystemHeaderFiles: false, file: true },
      }));
    });

    it("should keep writing to the file given by -MF", () => {
      assert.deepEqual(parseLine({ line: "-MF a.d -M" }).dependencies, {
        ...defaultOptions.dependencies,
        generate: true,
        includeSystemHeaderFiles: true,
        file: true,
        filename: "a.d",
      });
    });

    it("should parse targets in order", () => {
      assert.deepEqual(parseLine({ line: "-MT a.o -MQb.o" }).dependencies.targets, [
        { name: "a.o", quoted: false },
        { name: "b.o", quoted: true },
      ]);
    });
  });

  describe("debug", () => {
    it("should parse debug levels", () => {
      assert.deepEqual(parseLine({ line: "-g3" }), withGroup({ group: "debug", values: { level: 3 } }));
      assert.deepEqual(parseLine({ line: "-ggdb1" }), withGroup({ group: "debug", values: { format: "gdb", level: 1 } }));
    });

    it("should keep other debug options as unknown options", () => {
      assert.deepEqual(parseLine({ line: "-gfoo -ggdbx" }).unknownOptions, { "-gfoo": "", "-ggdbx": "" });
    });
  });

  describe("instrumentation", () => {
    it("should parse sanitizers in order", () => {
      const line = "-fsanitize=address,undefined -fno-sanitize=vptr -fsanitize-recover -fno-sanitize-trap=all";

      assert.deepEqual(parseLine({ line }), withGroup({
        group: "instrumentation",
        values: {
          sanitizers: [
            { name: "address", enabled: true },
            { name: "undefined", enabled: true },
            { name: "vptr", enabled: false },
          ],
          sanitizerRecover: [{ name: "all", enabled: true }],
          sanitizerTrap: [{ name: "all", enabled: false }],
        },
      }));
    });

    it("should parse sanitizer coverage", () => {
      assert.deepEqual(parseLine({ line: "-fsanitize-coverage=trace-pc,trace-cmp -fsanitize-coverage=inline-8bit-counters" }), withGroup({
        group: "instrumentation",
        values: { sanitizerCoverage: ["trace-pc", "trace-cmp", "inline-8bit-counters"] },
      }));
    });
  });

  describe("driver and target", () => {
    it("should parse parameters", () => {
      assert.deepEqual(parseLine({ line: "--param max-inline-insns=10 --param=a=b=c" }).driver.parameters, [
        { name: "max-inline-insns", value: "10" },
        { name: "a", value: "b=c" },
      ]);
    });

    it("should reject a parameter without value", () => {
      assert.throws(() => {
        parseLine({ line: "--param inline" });
      }, { message: `invalid value "inline" for option --param` });
    });

    it("should parse arguments for single architectures", () => {
      assert.deepEqual(parseLine({ line: "-Xarch_x86_64 -msse4.2 a.c" }), {
        ...withGroup({ group: "driver", values: { architectureArguments: [{ architecture: "x86_64", argument: "-msse4.2" }] } }),
        inputs: [{ kind: "file", path: "a.c", language: undefined }],
      });
    });

    it("should parse the single dash spellings of the integrated assembler", () => {
      assert.deepEqual(parseLine({ line: "-integrated-as" }), withGroup({ group: "driver", values: { integratedAssembler: true } }));
      assert.deepEqual(parseLine({ line: "-no-integrated-as" }), withGroup({ group: "driver", values: { integratedAssembler: false } }));
    });

    it("should parse apple deployment targets", () => {
      assert.deepEqual(parseLine({ line: "-mios-simulator-version-min=12.0" }), withGroup({
        group: "target",
        values: { appleDeploymentTarget: { platform: "ios-simulator", version: "12.0" } },
      }));
    });
  });

  describe("warnings", () => {
    it("should parse named warnings", () => {
      assert.deepEqual(parseLine({ line: "-Wshadow -Wno-unused -Werror=switch -Wno-error=shadow -Wformat=2" }), withGroup({
        group: "warnings",
        values: {
          shadow: { enabled: true, error: false, value: undefined },
          unused: { enabled: false, error: undefined, value: undefined },
          switch: { enabled: undefined, error: true, value: undefined },
          format: { enabled: true, error: undefined, value: "2" },
        },
      }));
    });

    it("should parse -W and -pedantic", () => {
      assert.deepEqual(parseLine({ line: "-W -pedantic" }), withGroup({
        group: "warnings",
        values: {
          extra: { enabled: true, error: undefined, value: undefined },
          pedantic: { enabled: true, error: undefined, value: undefined },
        },
      }));
    });

    it("should reject a warning value missing after =", () => {
      assert.throws(() => {
        parseLine({ line: "-Wformat=" });
      }, { message: "missing value for option -Wformat=" });
    });
  });

  describe("unknown options", () => {
    it("should keep them by name, with the value after the first =", () => {
      assert.deepEqual(parseLine({ line: "-fnew-thing -mfoo=bar=baz --unknown" }).unknownOptions, {
        "-fnew-thing": "",
        "-mfoo": "bar=baz",
        "--unknown": "",
      });
    });

    it("should keep every warning turned into an error or not", () => {
      assert.deepEqual(parseLine({ line: "-Werror=new -Wno-error=other -Werror=newer" }).unknownOptions, {
        "-Werror=new": "",
        "-Wno-error=other": "",
        "-Werror=newer": "",
      });
    });

    it("should move a repeated option to the end", () => {
      assert.deepEqual(Object.keys(parseLine({ line: "-fa -fb -fa" }).unknownOptions), ["-fb", "-fa"]);
    });
  });

  describe("options missing their value", () => {
    ["-o", "-Xarch_x86_64", "-D"].forEach((option) => {
      it(`should reject ${option} at the end`, () => {
        assert.throws(() => {
          parseCommandLine({ args: [option] });
        }, { message: `missing value for option ${option}` });
      });
    });

    it("should reject an empty value", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-o", ""] });
      }, { message: "missing value for option -o" });
    });
  });

  describe("option specs", () => {
    it("should give every option a single meaning", () => {
      const exactOptions = optionSpecs.filter(({ syntax }) => {
        return syntax !== "joined";
      }).map(({ option }) => {
        return option;
      });
      const prefixOptions = optionSpecs.filter(({ syntax }) => {
        return syntax !== "flag" && syntax !== "separate";
      }).map(({ option }) => {
        return option;
      });
      const duplicates = [exactOptions, prefixOptions].flatMap((options) => {
        return options.filter((option, index) => {
          return options.indexOf(option) !== index;
        });
      });

      assert.deepEqual(duplicates, []);
    });

    it("should parse every field of every group", () => {
      groupDescriptors.forEach((descriptor) => {
        const { group } = descriptor;
        const describedFields = [
          ...Object.keys(descriptor.flags),
          ...Object.keys(descriptor.toggles.names),
          ...[
            ...descriptor.choices,
            ...descriptor.enums,
            ...descriptor.strings,
            ...descriptor.numbers,
            ...descriptor.lists,
            ...descriptor.valuedToggles,
          ].map(({ field }) => {
            return field;
          }),
          ...customFields[group],
        ];

        assert.deepEqual(describedFields.toSorted(), Object.keys(defaultOptions[group]).toSorted(), group);
      });
    });
  });
});
