import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { formatCommandLine } from "./format-command-line.ts";
import {
  defaultDebugOptions,
  defaultDependencyInfoOptions,
  defaultOptimizationOptions,
  defaultOptions
} from "./options.ts";
import type { TCcOptions } from "./options.ts";

describe("formatCommandLine", () => {
  describe("action", () => {
    it("should format nothing for link", () => {
      assert.deepEqual(formatCommandLine({ options: defaultOptions }), []);
    });

    it("should format -c for compile", () => {
      assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, action: "compile" } }), ["-c"]);
    });

    it("should format -E for preprocess", () => {
      assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, action: "preprocess" } }), ["-E"]);
    });
  });

  it("should format the target", () => {
    assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, target: "wasm32" } }), ["--target=wasm32"]);
  });

  it("should format only enabled boolean flags", () => {
    const options: TCcOptions = {
      ...defaultOptions,
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
    const options: TCcOptions = {
      ...defaultOptions,
      optimization: { ...defaultOptimizationOptions, enable: true, level: 2, size: true }
    };

    assert.deepEqual(formatCommandLine({ options }), [
      "-O",
      "-O2",
      "-Os"
    ]);
  });

  it("should format all debug options", () => {
    const options: TCcOptions = {
      ...defaultOptions,
      debug: { ...defaultDebugOptions, enable: true, level: 0 }
    };

    assert.deepEqual(formatCommandLine({ options }), ["-g", "-g0"]);
  });

  it("should format no optimization and debug options when none are enabled", () => {
    const options: TCcOptions = {
      ...defaultOptions,
      optimization: defaultOptimizationOptions,
      debug: defaultDebugOptions
    };

    assert.deepEqual(formatCommandLine({ options }), []);
  });

  it("should format defines with and without value", () => {
    assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, defines: { A: true, B: "1" } } }), ["-DA", "-DB=1"]);
  });

  it("should format unknown options with and without value", () => {
    const options: TCcOptions = {
      ...defaultOptions,
      unknownOptions: { "-fpic": "", "-fvisibility": "default", "-Wno-unused": "", "-Ofast": "" }
    };

    assert.deepEqual(formatCommandLine({ options }), ["-fpic", "-fvisibility=default", "-Wno-unused", "-Ofast"]);
  });

  describe("dependency info", () => {
    it("should format nothing for empty dependency info", () => {
      assert.deepEqual(formatCommandLine({ options: { ...defaultOptions, dependencyInfo: defaultDependencyInfoOptions } }), []);
    });

    it("should format -MD for a dependency file including system headers", () => {
      const options: TCcOptions = {
        ...defaultOptions,
        action: "compile",
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, file: true, includeSystemHeaderFiles: true }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-c", "-MD"]);
    });

    it("should format -MMD for a dependency file excluding system headers", () => {
      const options: TCcOptions = {
        ...defaultOptions,
        action: "compile",
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, file: true, includeSystemHeaderFiles: false }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-c", "-MMD"]);
    });

    it("should format -M when preprocessing including system headers", () => {
      const options: TCcOptions = {
        ...defaultOptions,
        action: "preprocess",
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, includeSystemHeaderFiles: true }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-E", "-M"]);
    });

    it("should format -MM when preprocessing excluding system headers", () => {
      const options: TCcOptions = {
        ...defaultOptions,
        action: "preprocess",
        dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, includeSystemHeaderFiles: false }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-E", "-MM"]);
    });

    it("should reject dependency info without a file when not preprocessing", () => {
      assert.throws(() => {
        formatCommandLine({
          options: {
            ...defaultOptions,
            action: "compile",
            dependencyInfo: { ...defaultDependencyInfoOptions, generate: true }
          }
        });
      }, { message: "non-file dependency info requested but action is not preprocess" });
    });

    it("should format target, filename and missing headers", () => {
      const options: TCcOptions = {
        ...defaultOptions,
        dependencyInfo: { ...defaultDependencyInfoOptions, target: "a.o", file: true, filename: "a.d", includeMissing: true }
      };

      assert.deepEqual(formatCommandLine({ options }), ["-MT", "a.o", "-MF", "a.d", "-MP"]);
    });

    it("should reject a filename when file output is not enabled", () => {
      assert.throws(() => {
        formatCommandLine({ options: { ...defaultOptions, dependencyInfo: { ...defaultDependencyInfoOptions, filename: "a.d" } } });
      }, { message: "filename given but file output not enabled" });
    });
  });

  it("should format all options in a stable order", () => {
    const options: TCcOptions = {
      ...defaultOptions,
      outputFile: "a.o",
      dependencyInfo: { ...defaultDependencyInfoOptions, generate: true, file: true, includeSystemHeaderFiles: false },
      libraries: ["m"],
      unknownOptions: { "-fpic": "", "-Wall": "" },
      defines: { A: true },
      libraryDirectories: ["lib"],
      includeFiles: ["config.h"],
      includeDirectories: ["include"],
      debug: { ...defaultDebugOptions, enable: true },
      optimization: { ...defaultOptimizationOptions, level: 2 },
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
