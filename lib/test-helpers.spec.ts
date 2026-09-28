import { defaultOptions } from "./options.ts";
import type { TOptionSyntax } from "./option-descriptors.ts";
import type {
  TCcOptionGroupName,
  TCcOptions
} from "./options.ts";

// the options of an empty command line with one field of a group changed
const withField = ({ group, field, value }: { group: TCcOptionGroupName; field: string; value: unknown }) => {
  return { ...defaultOptions, [group]: { ...defaultOptions[group], [field]: value } } as TCcOptions;
};

// the options of an empty command line with some fields of a group changed
const withGroup = <TGroupName extends TCcOptionGroupName>({
  group,
  values
}: {
  group: TGroupName;
  values: Partial<TCcOptions[TGroupName]>;
}): TCcOptions => {
  return { ...defaultOptions, [group]: { ...defaultOptions[group], ...values } };
};

// the arguments giving an option a value
const argsFor = ({ option, syntax, value }: { option: string; syntax: TOptionSyntax; value: string }) => {
  if (syntax === "separate" || syntax === "separate-or-joined") {
    return [option, value];
  }

  return [`${option}${value}`];
};

// a command line without quoting, one argument per word
const splitLine = ({ line }: { line: string }) => {
  return line.split(" ");
};

export {
  argsFor,
  splitLine,
  withField,
  withGroup
};
