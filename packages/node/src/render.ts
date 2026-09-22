// Output styles (docs/nomenclature.md section 10).

import { COMPLEMENT_BY_CODE, STREET_OUTPUT } from "./codes.js";
import type { ParsedAddress, Style } from "./types.js";

type Fields = Pick<
  ParsedAddress,
  | "streetType"
  | "streetNumber"
  | "streetName"
  | "streetLetter"
  | "streetQuadrant"
  | "crossNumber"
  | "crossLetter"
  | "crossQuadrant"
  | "plateNumber"
  | "complements"
>;

const SMALL_WORDS = ["de", "del", "la", "las", "los", "el", "y"];

/** "38" + "A BIS" -> "38A BIS": a leading single letter attaches to the number. */
function numberWithSuffix(n: number, suffix: string | null, bis: string): string {
  if (!suffix) return String(n);
  let parts = suffix.split(" ").map((p) => (p === "BIS" ? bis : p));
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

/** "DE LA FACTORÍA" -> "de la Factoría": Spanish small words stay lowercase. */
function nameTitleCase(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((w) => (SMALL_WORDS.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function streetPart(f: Fields, titled: boolean, bis: string): string | null {
  if (f.streetName !== null) return titled ? nameTitleCase(f.streetName) : f.streetName;
  if (f.streetNumber !== null) return numberWithSuffix(f.streetNumber, f.streetLetter, bis);
  return null;
}

function renderCodes(f: Fields, style: "catastral" | "igac" | "dian"): string {
  const titled = style === "igac";
  const quadrant = (q: string) => (titled ? titleCase(q) : q);
  const parts: string[] = [];
  if (f.streetType) parts.push(STREET_OUTPUT[f.streetType][style]);
  const street = streetPart(f, titled, "BIS");
  if (street !== null) parts.push(street);
  if (f.streetQuadrant) parts.push(quadrant(f.streetQuadrant));
  if (f.crossNumber !== null) parts.push(numberWithSuffix(f.crossNumber, f.crossLetter, "BIS"));
  if (f.plateNumber !== null) parts.push(String(f.plateNumber));
  if (f.crossQuadrant) parts.push(quadrant(f.crossQuadrant));
  for (const c of f.complements) {
    const code = COMPLEMENT_BY_CODE[c.code];
    parts.push(code ? code[style] : c.code, c.value);
  }
  return parts.join(" ");
}

function renderReadable(f: Fields): string {
  const head: string[] = [];
  if (f.streetType) head.push(STREET_OUTPUT[f.streetType].readable);
  const street = streetPart(f, true, "Bis");
  if (street !== null) head.push(street);
  if (f.streetQuadrant) head.push(titleCase(f.streetQuadrant));
  let out = head.join(" ");

  if (f.crossNumber !== null) {
    let cross = numberWithSuffix(f.crossNumber, f.crossLetter, "Bis");
    if (f.plateNumber !== null) cross += `-${f.plateNumber}`;
    if (f.crossQuadrant) cross += ` ${titleCase(f.crossQuadrant)}`;
    out = out ? `${out} # ${cross}` : `# ${cross}`;
  }
  for (const c of f.complements) {
    out += `, ${COMPLEMENT_BY_CODE[c.code]?.readable ?? c.code} ${c.value}`;
  }
  return out;
}

export function render(fields: Fields, style: Style): string {
  return style === "readable" ? renderReadable(fields) : renderCodes(fields, style);
}
