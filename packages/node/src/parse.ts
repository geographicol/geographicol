// The parsing procedure from docs/nomenclature.md section 12, step by step.

import {
  AMBIGUOUS_COMPLEMENT_ALIASES,
  CALLE_LIKE,
  CARRERA_LIKE,
  COMPLEMENTS,
  type ComplementCode,
  NUMBER_MARKERS,
  ONCE_ONLY,
  PENALTIES,
  QUADRANT_ALIASES,
  SINGLE_LETTER_QUADRANTS,
  STREET_ALIASES,
  UNCOMMON_QUADRANTS,
} from "./codes.js";
import { render } from "./render.js";
import { type Token, tokenize } from "./tokenize.js";
import type { Complement, ParseOptions, ParsedAddress, Quadrant, StreetType } from "./types.js";

/** Street aliases as token lists, longest first so "avenida carrera" wins over "avenida". */
const STREET_MATCHERS: Array<{ type: StreetType; words: string[] }> = Object.entries(STREET_ALIASES)
  .flatMap(([type, aliases]) =>
    aliases.map((alias) => ({ type: type as StreetType, words: alias.split(" ") })),
  )
  .sort((a, b) => b.words.length - a.words.length);

const COMPLEMENT_MATCHERS: Array<{ code: ComplementCode; words: string[] }> = COMPLEMENTS.flatMap(
  (code) => code.aliases.map((alias) => ({ code, words: alias.split(" ") })),
).sort((a, b) => b.words.length - a.words.length);

type Fields = Omit<ParsedAddress, "canonical" | "normalized" | "confidence" | "warnings" | "raw">;

function emptyFields(): Fields {
  return {
    streetType: null,
    streetNumber: null,
    streetName: null,
    streetLetter: null,
    streetQuadrant: null,
    crossNumber: null,
    crossLetter: null,
    crossQuadrant: null,
    plateNumber: null,
    complements: [],
    locality: null,
    department: null,
  };
}

class AddressParser {
  private tokens: Token[] = [];
  private i = 0;
  readonly fields = emptyFields();
  /** Every warning occurrence, in order. Penalties are counted from this list. */
  readonly raised: string[] = [];

  constructor(private readonly raw: string) {}

  run(): void {
    const segments = this.raw.split(",");
    this.parseAddressSegment(segments[0] ?? "");
    for (const segment of segments.slice(1)) this.parseExtraSegment(segment);

    if (this.fields.locality !== null || this.fields.department !== null) {
      this.warn("LOCALITY_UNVERIFIED");
    }
  }

  private warn(code: string): void {
    this.raised.push(code);
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.i + offset];
  }

  // Steps 5 to 9, on the text before the first comma.
  private parseAddressSegment(text: string): void {
    this.tokens = tokenize(text);
    this.i = 0;
    const f = this.fields;

    f.streetType = this.parseStreetType();
    if (f.streetType === null) this.warn("UNRECOGNIZED_STREET_TYPE");

    if (f.streetType !== null && this.isNamedStreet()) {
      f.streetName = this.readStreetName();
      this.warn("NAMED_STREET");
    } else {
      f.streetNumber = this.parseNumber(3);
      if (f.streetNumber !== null) {
        f.streetLetter = this.parseSuffix();
        f.streetQuadrant = this.parseQuadrant();
      }
    }
    if (f.streetNumber === null && f.streetName === null) this.warn("MISSING_STREET_NUMBER");

    if (f.streetType === "KM") {
      this.warn("RURAL_ADDRESS");
      // A KM address is a road location: the rest is the road description.
      const rest = this.peek();
      if (rest) f.locality = text.slice(rest.start).trim();
      this.i = this.tokens.length;
    } else {
      this.parsePlaca();
    }

    if (f.crossNumber === null) this.warn("MISSING_CROSS_NUMBER");
    else if (f.plateNumber === null) this.warn("MISSING_PLATE_NUMBER");

    this.parseComplementsAndLeftovers(text, true);
  }

  // Step 3: a later comma segment is complements, or else locality, then department.
  private parseExtraSegment(text: string): void {
    this.tokens = tokenize(text);
    this.i = 0;
    if (this.tokens.length === 0) return;
    if (this.matchComplement()) {
      this.parseComplementsAndLeftovers(text, false);
      return;
    }
    const value = text.trim();
    if (this.fields.locality === null) this.fields.locality = value;
    else if (this.fields.department === null) this.fields.department = value;
    else for (const _ of this.tokens) this.warn("UNKNOWN_TOKEN");
  }

  // Step 5.
  private parseStreetType(): StreetType | null {
    for (const matcher of STREET_MATCHERS) {
      if (this.matchesWords(matcher.words)) {
        this.i += matcher.words.length;
        if (matcher.words.length === 1 && (matcher.words[0] ?? "").length === 1) {
          this.warn("AMBIGUOUS_STREET_TYPE");
        }
        return matcher.type;
      }
    }
    return null;
  }

  private matchesWords(words: string[]): boolean {
    return words.every((word, k) => {
      const token = this.peek(k);
      return token !== undefined && !token.isNum && token.norm === word;
    });
  }

  private isNumberMarker(token: Token | undefined): boolean {
    return token !== undefined && !token.isNum && NUMBER_MARKERS.includes(token.norm);
  }

  /** A word right after the street type, other than a number marker, starts a street name. */
  private isNamedStreet(): boolean {
    const next = this.peek();
    return next !== undefined && !next.isNum && !this.isNumberMarker(next);
  }

  /** Words up to the first number or number marker: "BOYACÁ", "DE LA FACTORÍA". */
  private readStreetName(): string {
    const words: string[] = [];
    while (this.peek() && !this.peek()?.isNum && !this.isNumberMarker(this.peek())) {
      words.push(this.peek()?.orig ?? "");
      this.i++;
    }
    return words.join(" ").toUpperCase();
  }

  private parseNumber(maxDigits: number): number | null {
    const token = this.peek();
    if (!token?.isNum || token.norm.length > maxDigits) return null;
    this.i++;
    return Number(token.norm);
  }

  // Letters and BIS after a number (section 4).
  private parseSuffix(): string | null {
    const parts: string[] = [];
    for (;;) {
      const token = this.peek();
      if (!token || token.isNum) break;
      if (token.norm === "bis") {
        parts.push("BIS");
      } else if (token.norm.length === 1 && /[a-z]/.test(token.norm)) {
        // N is never a letter: attached it is NORTE, alone it means "número".
        // Standing alone, S and E are quadrants.
        if (token.norm === "n") break;
        if (!token.attached && token.norm in SINGLE_LETTER_QUADRANTS) break;
        parts.push(token.norm.toUpperCase());
      } else {
        break;
      }
      this.i++;
    }
    return parts.length > 0 ? parts.join(" ") : null;
  }

  // Section 5.
  private parseQuadrant(): Quadrant | null {
    const token = this.peek();
    if (!token || token.isNum) return null;
    let quadrant = QUADRANT_ALIASES[token.norm];
    if (!quadrant && !token.attached) {
      quadrant = SINGLE_LETTER_QUADRANTS[token.norm];
      if (quadrant) this.warn("AMBIGUOUS_QUADRANT");
    }
    if (!quadrant && token.attached && token.norm === "n") {
      // Cali's "6N": an attached N is NORTE.
      quadrant = "NORTE";
      this.warn("AMBIGUOUS_QUADRANT");
    }
    if (!quadrant) return null;
    if (UNCOMMON_QUADRANTS.includes(quadrant)) this.warn("UNCOMMON_QUADRANT");
    this.i++;
    return quadrant;
  }

  // Steps 6-7: number markers, cross street, plate (section 6).
  private parsePlaca(): void {
    const f = this.fields;
    while (this.isNumberMarker(this.peek())) this.i++;

    const block = this.peek();
    if (!block?.isNum) return;
    if (block.norm.length >= 5) return; // left for the leftovers step: UNKNOWN_TOKEN
    this.i++;
    f.crossLetter = this.parseSuffix();
    f.crossQuadrant = this.parseQuadrant();

    const plate = this.peek();
    const plateFollows = plate?.isNum === true && plate.norm.length <= 3;
    if (
      !plateFollows &&
      f.crossLetter === null &&
      f.crossQuadrant === null &&
      block.norm.length >= 3
    ) {
      // Glued cross and plate: "1230" -> 12 and 30.
      f.crossNumber = Number(block.norm.slice(0, -2));
      f.plateNumber = Number(block.norm.slice(-2));
      this.warn("AMBIGUOUS_PLATE");
    } else {
      f.crossNumber = Number(block.norm);
      if (plateFollows) {
        this.i++;
        f.plateNumber = Number(plate.norm);
      }
    }
    if (f.crossQuadrant === null) this.parseTrailingQuadrant();
  }

  /** A quadrant after the plate follows the kind of street it describes (section 5). */
  private parseTrailingQuadrant(): void {
    const f = this.fields;
    const quadrant = this.parseQuadrant();
    if (quadrant === null) return;
    const street = f.streetType;
    const belongsToStreet =
      f.streetQuadrant === null &&
      street !== null &&
      ((quadrant === "SUR" && CALLE_LIKE.includes(street)) ||
        (quadrant === "ESTE" && CARRERA_LIKE.includes(street)));
    if (belongsToStreet) f.streetQuadrant = quadrant;
    else f.crossQuadrant = quadrant;
  }

  private matchComplement(): { code: ComplementCode; length: number; alias: string } | null {
    for (const matcher of COMPLEMENT_MATCHERS) {
      if (!this.matchesWords(matcher.words)) continue;
      const alias = matcher.words.join(" ");
      const next = this.peek(matcher.words.length);
      // "tr" is Torre only once the placa is parsed; "p" and "l" only before a number.
      if (alias === "tr" && this.fields.crossNumber === null) continue;
      if ((alias === "p" || alias === "l") && !next?.isNum) continue;
      return { code: matcher.code, length: matcher.words.length, alias };
    }
    return null;
  }

  // Steps 8-9.
  private parseComplementsAndLeftovers(text: string, localityAllowed: boolean): void {
    while (this.peek()) {
      const match = this.matchComplement();
      if (match) {
        this.i += match.length;
        if (AMBIGUOUS_COMPLEMENT_ALIASES.includes(match.alias)) this.warn("AMBIGUOUS_COMPLEMENT");
        const value = match.code.nameValued ? this.readNameValue() : this.readTokenValue();
        if (value === null) {
          this.warn("UNKNOWN_TOKEN");
          continue;
        }
        const complement: Complement = { type: match.code.type, code: match.code.catastral, value };
        this.fields.complements.push(complement);
        continue;
      }

      const rest = this.tokens.slice(this.i);
      const allWords = rest.every((token) => !token.isNum);
      if (
        localityAllowed &&
        allWords &&
        this.fields.crossNumber !== null &&
        this.fields.locality === null
      ) {
        this.fields.locality = text.slice(rest[0]?.start ?? 0).trim();
        this.i = this.tokens.length;
        return;
      }
      this.warn("UNKNOWN_TOKEN");
      this.i++;
    }
  }

  /** One token, plus any tokens attached to it: "501B". */
  private readTokenValue(): string | null {
    const first = this.peek();
    if (!first || this.matchComplement()) return null;
    let value = first.orig;
    this.i++;
    while (this.peek()?.attached) {
      value += this.peek()?.orig ?? "";
      this.i++;
    }
    return value.toUpperCase();
  }

  /** Words up to the next complement keyword or the end: "SAN FERNANDO". */
  private readNameValue(): string | null {
    const words: string[] = [];
    while (this.peek() && !this.matchComplement()) {
      words.push(this.peek()?.orig ?? "");
      this.i++;
    }
    return words.length > 0 ? words.join(" ").toUpperCase() : null;
  }
}

function score(raised: string[], strict: boolean): number {
  let penalty = 0;
  const counted = new Set<string>();
  for (const code of raised) {
    if (ONCE_ONLY.includes(code) && counted.has(code)) continue;
    counted.add(code);
    penalty += PENALTIES[code] ?? 0;
  }
  if (strict) penalty *= 2;
  return Math.min(1, Math.max(0, 1 - penalty));
}

export function parse(input: string, options: ParseOptions = {}): ParsedAddress {
  const raw = input;
  if (raw.trim() === "") {
    const fields = emptyFields();
    return {
      ...fields,
      canonical: "",
      normalized: "",
      confidence: 0,
      warnings: ["EMPTY_INPUT"],
      raw,
    };
  }

  const parser = new AddressParser(raw);
  parser.run();
  const fields = parser.fields;
  return {
    ...fields,
    canonical: render(fields, options.style ?? "catastral"),
    normalized: render(fields, "readable"),
    confidence: score(parser.raised, options.strict ?? false),
    warnings: [...new Set(parser.raised)],
    raw,
  };
}
