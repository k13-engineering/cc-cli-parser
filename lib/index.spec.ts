import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { createCompilerCommandLineParser } from "./index.ts";

describe("createCompilerCommandLineParser", () => {
  const parser = createCompilerCommandLineParser();

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
