import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
  defaultDebugOptions,
  defaultDependencyInfoOptions,
  defaultOptimizationOptions,
  defaultOptions
} from "./options.ts";
import { parseCommandLine } from "./parse-command-line.ts";

describe("parseCommandLine", () => {
  describe("arguments", () => {
    it("should link by default", () => {
      assert.deepEqual(parseCommandLine({ args: [] }), defaultOptions);
    });

    it("should collect input files", () => {
      assert.deepEqual(parseCommandLine({ args: ["a.c", "b.c"] }), {
        ...defaultOptions,
        inputFiles: ["a.c", "b.c"]
      });
    });

    it("should treat arguments named like object properties as input files", () => {
      assert.deepEqual(parseCommandLine({ args: ["toString", "constructor"] }), {
        ...defaultOptions,
        inputFiles: ["toString", "constructor"]
      });
    });

    it("should reject unknown options", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-MQ"] });
      }, { message: "unknown option -MQ" });
    });
  });

  describe("flags", () => {
    it("should parse boolean flags", () => {
      const args = ["-pthread", "-nodefaultlibs", "-nostartfiles", "-nostdinc", "-nolibc", "-rdynamic", "-static"];

      assert.deepEqual(parseCommandLine({ args }), {
        ...defaultOptions,
        pthread: true,
        nodefaultlibs: true,
        nostartfiles: true,
        nostdinc: true,
        nolibc: true,
        rdynamic: true,
        static: true
      });
    });

    it("should ignore -Q options", () => {
      assert.deepEqual(parseCommandLine({ args: ["-Qunused-arguments"] }), defaultOptions);
    });
  });

  describe("files and directories", () => {
    it("should parse the output file", () => {
      assert.deepEqual(parseCommandLine({ args: ["-o", "a.out"] }), { ...defaultOptions, outputFile: "a.out" });
    });

    it("should parse include directories without duplicates", () => {
      assert.deepEqual(parseCommandLine({ args: ["-I", "a", "-Ib", "-Ia"] }), {
        ...defaultOptions,
        includeDirectories: ["a", "b"]
      });
    });

    it("should parse library directories without duplicates", () => {
      assert.deepEqual(parseCommandLine({ args: ["-L", "a", "-Lb", "-La"] }), {
        ...defaultOptions,
        libraryDirectories: ["a", "b"]
      });
    });

    it("should parse include files", () => {
      assert.deepEqual(parseCommandLine({ args: ["-include", "a.h", "-include", "b.h"] }), {
        ...defaultOptions,
        includeFiles: ["a.h", "b.h"]
      });
    });
  });

  describe("action", () => {
    it("should compile with -c", () => {
      assert.deepEqual(parseCommandLine({ args: ["-c"] }), { ...defaultOptions, action: "compile" });
    });

    it("should preprocess with -E", () => {
      assert.deepEqual(parseCommandLine({ args: ["-E"] }), { ...defaultOptions, action: "preprocess" });
    });

    it("should use the last action given", () => {
      assert.deepEqual(parseCommandLine({ args: ["-E", "-c"] }), { ...defaultOptions, action: "compile" });
    });
  });

  describe("defines", () => {
    it("should parse defines with and without value", () => {
      assert.deepEqual(parseCommandLine({ args: ["-D", "A", "-DB=1", "-DC="] }), {
        ...defaultOptions,
        defines: { A: true, B: "1", C: "" }
      });
    });

    it("should reject a define with multiple equals", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-DA=b=c"] });
      }, { message: `invalid define with multiple equals: "A=b=c"` });
    });
  });

  describe("code generation", () => {
    it("should parse enabled, disabled and valued options", () => {
      assert.deepEqual(parseCommandLine({ args: ["-fpic", "-fno-common", "-fvisibility=default"] }), {
        ...defaultOptions,
        codeGeneration: { pic: true, common: false, visibility: "default" }
      });
    });

    it("should use the last value given for an option", () => {
      assert.deepEqual(parseCommandLine({ args: ["-fno-pic", "-fpic"] }), {
        ...defaultOptions,
        codeGeneration: { pic: true }
      });
    });

    it("should reject an option with multiple equals", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-fa=b=c"] });
      }, { message: `invalid -f option with multiple equals: "a=b=c"` });
    });
  });

  describe("debug", () => {
    it("should enable debug information with -g", () => {
      assert.deepEqual(parseCommandLine({ args: ["-g"] }), { ...defaultOptions, debug: { ...defaultDebugOptions, enable: true } });
    });

    it("should parse a debug level", () => {
      assert.deepEqual(parseCommandLine({ args: ["-g0"] }), { ...defaultOptions, debug: { ...defaultDebugOptions, level: 0 } });
    });

    it("should parse enabled and disabled debug options", () => {
      assert.deepEqual(parseCommandLine({ args: ["-g", "-gdwarf", "-gno-pubnames"] }), {
        ...defaultOptions,
        debug: { ...defaultDebugOptions, enable: true, dwarf: true, pubnames: false }
      });
    });
  });

  describe("optimization", () => {
    it("should enable optimization with -O", () => {
      assert.deepEqual(parseCommandLine({ args: ["-O"] }), {
        ...defaultOptions,
        optimization: { ...defaultOptimizationOptions, enable: true }
      });
    });

    it("should parse an optimization level", () => {
      assert.deepEqual(parseCommandLine({ args: ["-O2"] }), {
        ...defaultOptions,
        optimization: { ...defaultOptimizationOptions, level: 2 }
      });
    });

    it("should parse optimization for size", () => {
      assert.deepEqual(parseCommandLine({ args: ["-Os"] }), {
        ...defaultOptions,
        optimization: { ...defaultOptimizationOptions, size: true }
      });
    });

    it("should parse named optimizations", () => {
      assert.deepEqual(parseCommandLine({ args: ["-Ofast"] }), {
        ...defaultOptions,
        optimization: { ...defaultOptimizationOptions, fast: true }
      });
    });

    it("should use the last optimization given", () => {
      assert.deepEqual(parseCommandLine({ args: ["-O2", "-Os"] }), {
        ...defaultOptions,
        optimization: { ...defaultOptimizationOptions, size: true }
      });
    });
  });

  describe("warnings", () => {
    it("should parse enabled and disabled warnings", () => {
      assert.deepEqual(parseCommandLine({ args: ["-Wall", "-Wno-unused"] }), {
        ...defaultOptions,
        warn: { all: true, unused: false }
      });
    });

    it("should reject -W without a warning", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-W"] });
      }, { message: "-W with arg not supported yet" });
    });
  });

  describe("std", () => {
    it("should parse the language standard", () => {
      assert.deepEqual(parseCommandLine({ args: ["-std=c99"] }), { ...defaultOptions, std: "c99" });
    });

    it("should reject an empty language standard", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-std="] });
      }, { message: "empty std given" });
    });
  });

  describe("libraries", () => {
    it("should parse libraries", () => {
      assert.deepEqual(parseCommandLine({ args: ["-lm", "-lc"] }), { ...defaultOptions, libraries: ["m", "c"] });
    });

    it("should reject -l without a library", () => {
      assert.throws(() => {
        parseCommandLine({ args: ["-l"] });
      }, { message: "library name must be given" });
    });
  });

  describe("dependency info", () => {
    it("should preprocess and generate dependency info including system headers with -M", () => {
      assert.deepEqual(parseCommandLine({ args: ["-M"] }), {
        ...defaultOptions,
        action: "preprocess",
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, includeSystemHeaderFiles: true }
      });
    });

    it("should preprocess and generate dependency info excluding system headers with -MM", () => {
      assert.deepEqual(parseCommandLine({ args: ["-MM"] }), {
        ...defaultOptions,
        action: "preprocess",
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, includeSystemHeaderFiles: false }
      });
    });

    it("should generate a dependency file including system headers with -MD", () => {
      assert.deepEqual(parseCommandLine({ args: ["-MD"] }), {
        ...defaultOptions,
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, includeSystemHeaderFiles: true, file: true }
      });
    });

    it("should generate a dependency file excluding system headers with -MMD", () => {
      assert.deepEqual(parseCommandLine({ args: ["-MMD"] }), {
        ...defaultOptions,
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, includeSystemHeaderFiles: false, file: true }
      });
    });

    it("should parse target, filename and missing headers", () => {
      assert.deepEqual(parseCommandLine({ args: ["-MT", "a.o", "-MF", "a.d", "-MP"] }), {
        ...defaultOptions,
        dependencyInfo: { ...defaultDependencyInfoOptions, target: "a.o", file: true, filename: "a.d", includeMissing: true }
      });
    });
  });
});
