import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { format, parse } from "./index.ts";

describe("parse and format", () => {
  [
    "-c test.c -o test.o",
    "-c -I. -I../../lib -I../../lib  -g -O2 -Qunused-arguments -pthread  -DHAVE_CONFIG_H  test_icount_cmds.c -o test_icount_cmds.o",
    "test.c -ffreestanding -nodefaultlibs -nostdinc -nostartfiles",
    "-E conftest.c"
  ].forEach((argsAsString) => {
    it(`should parse "${argsAsString}" correctly`, () => {
      const args = argsAsString.split(/\s+/);

      const options = parse({ args });
      const argsReformatted = format({ options });
      const optionsReparsed = parse({ args: argsReformatted });

      assert.deepEqual(options, optionsReparsed);
    });
  });

  [
    "-ftls-model=local-exec -fvisibility=default",
    "-rdynamic"
  ].forEach((argsAsString) => {
    it(`should parse "${argsAsString}" correctly`, () => {
      const args = argsAsString.split(/\s+/);

      const options = parse({ args });
      const argsReformatted = format({ options });

      assert.deepEqual(args, argsReformatted);
    });
  });
});
