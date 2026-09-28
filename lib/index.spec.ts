import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { formatCommandLine, parseCommandLine } from "./index.ts";

describe("parseCommandLine and formatCommandLine", () => {
  [
    "-c test.c -o test.o",
    "-c -I. -I../../lib -I../../lib  -g -O2 -Qunused-arguments -pthread  -DHAVE_CONFIG_H  test_icount_cmds.c -o test_icount_cmds.o",
    "test.c -ffreestanding -nodefaultlibs -nostdinc -nostartfiles",
    "-E conftest.c"
  ].forEach((argsAsString) => {
    it(`should parse "${argsAsString}" correctly`, () => {
      const args = argsAsString.split(/\s+/);

      const options = parseCommandLine({ args });
      const argsReformatted = formatCommandLine({ options });
      const optionsReparsed = parseCommandLine({ args: argsReformatted });

      assert.deepEqual(options, optionsReparsed);
    });
  });

  [
    "-ftls-model=local-exec -fvisibility=default",
    "-rdynamic",
    "a.c -static",
    "-fno-common",
    "-g2",
    "-E a.c -Iinclude -include config.h -DA -DB=1 -MM -MT a.o -MP"
  ].forEach((argsAsString) => {
    it(`should parse "${argsAsString}" correctly`, () => {
      const args = argsAsString.split(/\s+/);

      const options = parseCommandLine({ args });
      const argsReformatted = formatCommandLine({ options });

      assert.deepEqual(args, argsReformatted);
    });
  });
});
