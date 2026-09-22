// Placeholder public API. The parser is implemented from docs/nomenclature.md.

export interface ParseOptions {
  style?: "igac" | "dian" | "readable";
  strict?: boolean;
}

export function normalize(input: string, _options: ParseOptions = {}): string {
  return input;
}
