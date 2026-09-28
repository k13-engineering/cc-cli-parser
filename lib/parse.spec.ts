import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { parse } from "./parse.ts";

describe("parse", () => {
  describe("arguments", () => {
    it("should link by default", () => {
      assert.deepEqual(parse({ args: [] }), { action: "link" });
    });

    it("should collect input files", () => {
      assert.deepEqual(parse({ args: ["a.c", "b.c"] }), {
        action: "link",
        inputFiles: ["a.c", "b.c"]
      });
    });

    it("should treat arguments named like object properties as input files", () => {
      assert.deepEqual(parse({ args: ["toString", "constructor"] }), {
        action: "link",
        inputFiles: ["toString", "constructor"]
      });
    });

    it("should reject unknown options", () => {
      assert.throws(() => {
        parse({ args: ["-MQ"] });
      }, { message: "unknown option -MQ" });
    });
  });

  describe("flags", () => {
    it("should parse boolean flags", () => {
      const args = ["-pthread", "-nodefaultlibs", "-nostartfiles", "-nostdinc", "-nolibc", "-rdynamic", "-static"];

      assert.deepEqual(parse({ args }), {
        action: "link",
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
      assert.deepEqual(parse({ args: ["-Qunused-arguments"] }), { action: "link" });
    });
  });

  describe("files and directories", () => {
    it("should parse the output file", () => {
      assert.deepEqual(parse({ args: ["-o", "a.out"] }), { action: "link", outputFile: "a.out" });
    });

    it("should parse include directories without duplicates", () => {
      assert.deepEqual(parse({ args: ["-I", "a", "-Ib", "-Ia"] }), {
        action: "link",
        includeDirectories: ["a", "b"]
      });
    });

    it("should parse library directories without duplicates", () => {
      assert.deepEqual(parse({ args: ["-L", "a", "-Lb", "-La"] }), {
        action: "link",
        libraryDirectories: ["a", "b"]
      });
    });

    it("should parse include files", () => {
      assert.deepEqual(parse({ args: ["-include", "a.h", "-include", "b.h"] }), {
        action: "link",
        includeFiles: ["a.h", "b.h"]
      });
    });
  });

  describe("action", () => {
    it("should compile with -c", () => {
      assert.deepEqual(parse({ args: ["-c"] }), { action: "compile" });
    });

    it("should preprocess with -E", () => {
      assert.deepEqual(parse({ args: ["-E"] }), { action: "preprocess" });
    });

    it("should use the last action given", () => {
      assert.deepEqual(parse({ args: ["-E", "-c"] }), { action: "compile" });
    });
  });

  describe("defines", () => {
    it("should parse defines with and without value", () => {
      assert.deepEqual(parse({ args: ["-D", "A", "-DB=1", "-DC="] }), {
        action: "link",
        defines: { A: true, B: "1", C: "" }
      });
    });

    it("should reject a define with multiple equals", () => {
      assert.throws(() => {
        parse({ args: ["-DA=b=c"] });
      }, { message: `invalid define with multiple equals: "A=b=c"` });
    });
  });

  describe("code generation", () => {
    it("should parse enabled, disabled and valued options", () => {
      assert.deepEqual(parse({ args: ["-fpic", "-fno-common", "-fvisibility=default"] }), {
        action: "link",
        codeGeneration: { pic: true, common: false, visibility: "default" }
      });
    });

    it("should use the last value given for an option", () => {
      assert.deepEqual(parse({ args: ["-fno-pic", "-fpic"] }), {
        action: "link",
        codeGeneration: { pic: true }
      });
    });

    it("should reject an option with multiple equals", () => {
      assert.throws(() => {
        parse({ args: ["-fa=b=c"] });
      }, { message: `invalid -f option with multiple equals: "a=b=c"` });
    });
  });

  describe("debug", () => {
    it("should enable debug information with -g", () => {
      assert.deepEqual(parse({ args: ["-g"] }), { action: "link", debug: { enable: true } });
    });

    it("should parse a debug level", () => {
      assert.deepEqual(parse({ args: ["-g0"] }), { action: "link", debug: { level: 0 } });
    });

    it("should parse enabled and disabled debug options", () => {
      assert.deepEqual(parse({ args: ["-g", "-gdwarf", "-gno-pubnames"] }), {
        action: "link",
        debug: { enable: true, dwarf: true, pubnames: false }
      });
    });
  });

  describe("optimization", () => {
    it("should enable optimization with -O", () => {
      assert.deepEqual(parse({ args: ["-O"] }), { action: "link", optimization: { enable: true } });
    });

    it("should parse an optimization level", () => {
      assert.deepEqual(parse({ args: ["-O2"] }), { action: "link", optimization: { level: 2 } });
    });

    it("should parse optimization for size", () => {
      assert.deepEqual(parse({ args: ["-Os"] }), { action: "link", optimization: { size: true } });
    });

    it("should parse named optimizations", () => {
      assert.deepEqual(parse({ args: ["-Ofast"] }), { action: "link", optimization: { fast: true } });
    });

    it("should use the last optimization given", () => {
      assert.deepEqual(parse({ args: ["-O2", "-Os"] }), { action: "link", optimization: { size: true } });
    });
  });

  describe("warnings", () => {
    it("should parse enabled and disabled warnings", () => {
      assert.deepEqual(parse({ args: ["-Wall", "-Wno-unused"] }), {
        action: "link",
        warn: { all: true, unused: false }
      });
    });

    it("should reject -W without a warning", () => {
      assert.throws(() => {
        parse({ args: ["-W"] });
      }, { message: "-W with arg not supported yet" });
    });
  });

  describe("std", () => {
    it("should parse the language standard", () => {
      assert.deepEqual(parse({ args: ["-std=c99"] }), { action: "link", std: "c99" });
    });

    it("should reject an empty language standard", () => {
      assert.throws(() => {
        parse({ args: ["-std="] });
      }, { message: "empty std given" });
    });
  });

  describe("libraries", () => {
    it("should parse libraries", () => {
      assert.deepEqual(parse({ args: ["-lm", "-lc"] }), { action: "link", libraries: ["m", "c"] });
    });

    it("should reject -l without a library", () => {
      assert.throws(() => {
        parse({ args: ["-l"] });
      }, { message: "library name must be given" });
    });
  });

  describe("dependency info", () => {
    it("should preprocess and generate dependency info including system headers with -M", () => {
      assert.deepEqual(parse({ args: ["-M"] }), {
        action: "preprocess",
        dependencyInfo: { generate: true, includeSystemHeaderFiles: true }
      });
    });

    it("should preprocess and generate dependency info excluding system headers with -MM", () => {
      assert.deepEqual(parse({ args: ["-MM"] }), {
        action: "preprocess",
        dependencyInfo: { generate: true, includeSystemHeaderFiles: false }
      });
    });

    it("should generate a dependency file including system headers with -MD", () => {
      assert.deepEqual(parse({ args: ["-MD"] }), {
        action: "link",
        dependencyInfo: { generate: true, includeSystemHeaderFiles: true, file: true }
      });
    });

    it("should generate a dependency file excluding system headers with -MMD", () => {
      assert.deepEqual(parse({ args: ["-MMD"] }), {
        action: "link",
        dependencyInfo: { generate: true, includeSystemHeaderFiles: false, file: true }
      });
    });

    it("should parse target, filename and missing headers", () => {
      assert.deepEqual(parse({ args: ["-MT", "a.o", "-MF", "a.d", "-MP"] }), {
        action: "link",
        dependencyInfo: { target: "a.o", file: true, filename: "a.d", includeMissing: true }
      });
    });
  });
});
