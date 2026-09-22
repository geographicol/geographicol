import { parse } from "./parse.js";
import type { ParseOptions } from "./types.js";

export { parse };
export type {
  Complement,
  ComplementType,
  ParseOptions,
  ParsedAddress,
  Quadrant,
  StreetType,
  Style,
} from "./types.js";

/** The canonical string for `input`: `parse(input, options).canonical`. */
export function normalize(input: string, options: ParseOptions = {}): string {
  return parse(input, options).canonical;
}

/** True when confidence is at least 0.7, a cross number is present, and a street number or name. */
export function isValid(input: string): boolean {
  const result = parse(input);
  const hasStreet = result.streetNumber !== null || result.streetName !== null;
  return result.confidence >= 0.7 && hasStreet && result.crossNumber !== null;
}
