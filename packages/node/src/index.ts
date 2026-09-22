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

/** True when confidence is at least 0.7 and both the street and cross numbers are present. */
export function isValid(input: string): boolean {
  const result = parse(input);
  return result.confidence >= 0.7 && result.streetNumber !== null && result.crossNumber !== null;
}
