import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { formatCommandLine } from "./format-command-line.ts";
import type { TCcOptions } from "./options.ts";

describe("formatCommandLine", () => {
  describe("action", () => {
    it("should format nothing for link", () => {
      assert.deepEqual(formatCommandLine({ options: { action: "link" } }), []);
    });

    it("should format -c for compile", () => {
      assert.deepEqual(formatCommandLine({ options: { action: "compile" } }), ["-c"]);
    });

    it("should format -E for preprocess", () => {
      assert.deepEqual(formatCommandLine({ options: { action: "preprocess" } }), ["-E"]);
    });
  });

  it("should format the target", () => {
    assert.deepEqual(formatCommandLine({ options: { action: "link", target: "wasm32" } }), ["--target=wasm32"]);
  });

  it("should format only enabled boolean flags", () => {
    const options: TCcOptions = {
      action: "link",
      static: true,
      rdynamic: false,
      nolibc: true,
      nostdinc: true,
      nostartfiles: true,
      nodefaultlibs: true,
      pthread: true
    };

    assert.deepEqual(formatCommandLine({ options }), [
      "-pthread",
      "-nodefaultlibs",
      "-nostartfiles",
      "-nostdinc",
      "-nolibc",
      "-static"
    ]);
  });

  it("should format all optimization options", () => {
    assert.deepEqual(formatCommandLine({ options: { action: "link", optimization: { enable: true, level: 2, size: true } } }), [
      "-O",
      "-O2",
      "-Os"
    ]);
  });

  it("should format all debug options", () => {
    assert.deepEqual(formatCommandLine({ options: { action: "link", debug: { enable: true, level: 0 } } }), ["-g", "-g0"]);
  });

  it("should format no optimization and debug options when none are enabled", () => {
    assert.deepEqual(formatCommandLine({ options: { action: "link", optimization: {}, debug: {} } }), []);
  });

  it("should format defines with and without value", () => {
    assert.deepEqual(formatCommandLine({ options: { action: "link", defines: { A: true, B: "1" } } }), ["-DA", "-DB=1"]);
  });

  it("should format enabled, disabled and valued code generation options", () => {
    const options: TCcOptions = {
      action: "link",
      codeGeneration: { pic: true, common: false, visibility: "default" }
    };

    assert.deepEqual(formatCommandLine({ options }), ["-fpic", "-fno-common", "-fvisibility=default"]);
  });

  describe("warnings", () => {
    it("should format enabled and disabled warnings", () => {
      assert.deepEqual(formatCommandLine({ options: { action: "link", warn: { all: true, unused: false } } }), ["-Wall", "-Wno-unused"]);
    });

    it("should reject non-boolean warnings", () => {
      const options = { action: "link", warn: { all: "yes" } } as unknown as TCcOptions;

      assert.throws(() => {
        formatCommandLine({ options });
      }, { message: "unsupported value yes" });
    });
  });

  describe("dependency info", () => {
    it("should format nothing for empty dependency info", () => {
      assert.deepEqual(formatCommandLine({ options: { action: "link", dependencyInfo: {} } }), []);
    });

    it("should format -MD for a dependency file including system headers", () => {
      const options: TCcOptions = {
        action: "compile",
        dependencyInfo: { generate: true, file: true, includeSystemHeaderFiles: true }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-c", "-MD"]);
    });

    it("should format -MMD for a dependency file excluding system headers", () => {
      const options: TCcOptions = {
        action: "compile",
        dependencyInfo: { generate: true, file: true, includeSystemHeaderFiles: false }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-c", "-MMD"]);
    });

    it("should format -M when preprocessing including system headers", () => {
      const options: TCcOptions = {
        action: "preprocess",
        dependencyInfo: { generate: true, includeSystemHeaderFiles: true }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-E", "-M"]);
    });

    it("should format -MM when preprocessing excluding system headers", () => {
      const options: TCcOptions = {
        action: "preprocess",
        dependencyInfo: { generate: true, includeSystemHeaderFiles: false }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-E", "-MM"]);
    });

    it("should reject dependency info without a file when not preprocessing", () => {
      assert.throws(() => {
        formatCommandLine({ options: { action: "compile", dependencyInfo: { generate: true } } });
      }, { message: "non-file dependency info requested but action is not preprocess" });
    });

    it("should format target, filename and missing headers", () => {
      const options: TCcOptions = {
        action: "link",
        dependencyInfo: { target: "a.o", file: true, filename: "a.d", includeMissing: true }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-MT", "a.o", "-MF", "a.d", "-MP"]);
    });

    it("should reject a filename when file output is not enabled", () => {
      assert.throws(() => {
        formatCommandLine({ options: { action: "link", dependencyInfo: { filename: "a.d" } } });
      }, { message: "filename given but file output not enabled" });
    });
  });

  it("should format all options in a stable order", () => {
    const options: TCcOptions = {
      outputFile: "a.o",
      dependencyInfo: { generate: true, file: true, includeSystemHeaderFiles: false },
      libraries: ["m"],
      warn: { all: true },
      codeGeneration: { pic: true },
      defines: { A: true },
      libraryDirectories: ["lib"],
      includeFiles: ["config.h"],
      includeDirectories: ["include"],
      debug: { enable: true },
      optimization: { level: 2 },
      std: "c99",
      pthread: true,
      inputFiles: ["a.c"],
      target: "wasm32",
      action: "compile"
    };

    assert.deepEqual(formatCommandLine({ options }), [
      "-c",
      "--target=wasm32",
      "a.c",
      "-pthread",
      "-std=c99",
      "-O2",
      "-g",
      "-Iinclude",
      "-include",
      "config.h",
      "-Llib",
      "-DA",
      "-fpic",
      "-Wall",
      "-lm",
      "-MMD",
      "-o",
      "a.o"
    ]);
  });
});
