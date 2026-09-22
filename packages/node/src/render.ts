// Output styles (docs/nomenclature.md section 10).

import { COMPLEMENT_BY_IGAC, STREET_OUTPUT } from "./codes.js";
import type { ParsedAddress, Style } from "./types.js";

type Fields = Pick<
  ParsedAddress,
  | "streetType"
  | "streetNumber"
  | "streetLetter"
  | "streetQuadrant"
  | "crossNumber"
  | "crossLetter"
  | "crossQuadrant"
  | "plateNumber"
  | "complements"
>;

/** "38" + "A BIS" -> "38A BIS": a leading single letter attaches to the number. */
function numberWithSuffix(n: number, suffix: string | null, readable: boolean): string {
  if (!suffix) return String(n);
  let parts = suffix.split(" ");
  if (readable) parts = parts.map((p) => (p === "BIS" ? "Bis" : p));
  let out = String(n);
  if ((parts[0] ?? "").length === 1) {
    out += parts[0];
    parts = parts.slice(1);
  }
  return [out, ...parts].join(" ");
}

function titleCase(word: string): string {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

function renderCodes(f: Fields, style: "igac" | "dian"): string {
  const parts: string[] = [];
  if (f.streetType) parts.push(STREET_OUTPUT[f.streetType][style]);
  if (f.streetNumber !== null) parts.push(numberWithSuffix(f.streetNumber, f.streetLetter, false));
  if (f.streetQuadrant) parts.push(f.streetQuadrant);
  if (f.crossNumber !== null) parts.push(numberWithSuffix(f.crossNumber, f.crossLetter, false));
  if (f.plateNumber !== null) parts.push(String(f.plateNumber));
  if (f.crossQuadrant) parts.push(f.crossQuadrant);
  for (const c of f.complements) {
    const code = COMPLEMENT_BY_IGAC[c.code];
    parts.push(code ? code[style] : c.code, c.value);
  }
  return parts.join(" ");
}

function renderReadable(f: Fields): string {
  const head: string[] = [];
  if (f.streetType) head.push(STREET_OUTPUT[f.streetType].readable);
  if (f.streetNumber !== null) head.push(numberWithSuffix(f.streetNumber, f.streetLetter, true));
  if (f.streetQuadrant) head.push(titleCase(f.streetQuadrant));
  let out = head.join(" ");

  if (f.crossNumber !== null) {
    let cross = numberWithSuffix(f.crossNumber, f.crossLetter, true);
    if (f.plateNumber !== null) cross += `-${f.plateNumber}`;
    if (f.crossQuadrant) cross += ` ${titleCase(f.crossQuadrant)}`;
    out = out ? `${out} # ${cross}` : `# ${cross}`;
  }
  for (const c of f.complements) {
    out += `, ${COMPLEMENT_BY_IGAC[c.code]?.readable ?? c.code} ${c.value}`;
  }
  return out;
}

export function render(fields: Fields, style: Style): string {
  return style === "readable" ? renderReadable(fields) : renderCodes(fields, style);
}
