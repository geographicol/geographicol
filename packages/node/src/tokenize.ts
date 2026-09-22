// Step 4 of the parsing procedure (docs/nomenclature.md section 12).

export interface Token {
  /** Lowercase, accents stripped (ñ kept). Used for matching. */
  norm: string;
  /** The same characters as they appear in the input. */
  orig: string;
  isNum: boolean;
  /** True when no separator stands between this token and the previous one: the "A" in "45A". */
  attached: boolean;
  start: number;
  end: number;
}

type CharClass = "letter" | "digit" | "separator";

/** Normalizes one character for matching. */
export function normalizeChar(char: string): string {
  if (char === "ñ" || char === "Ñ") return "ñ";
  if (char === "º" || char === "°") return "o";
  return char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function classify(norm: string): CharClass {
  if (/^[a-zñ]$/.test(norm)) return "letter";
  if (/^[0-9]$/.test(norm)) return "digit";
  return "separator";
}

/**
 * Splits on spaces, "#", hyphens, dashes, periods and any other punctuation,
 * and on letter-digit boundaries: "KR45" -> "KR", "45" and "45A" -> "45", "A".
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let current: { cls: CharClass; start: number; norm: string } | null = null;
  let lastEnd = -1;

  const flush = (end: number) => {
    if (!current) return;
    tokens.push({
      norm: current.norm,
      orig: text.slice(current.start, end),
      isNum: current.cls === "digit",
      attached: tokens.length > 0 && current.start === lastEnd,
      start: current.start,
      end,
    });
    lastEnd = end;
    current = null;
  };

  const chars = Array.from(text);
  let offset = 0;
  for (const char of chars) {
    const norm = normalizeChar(char);
    const cls = classify(norm);
    if (cls === "separator") {
      flush(offset);
    } else if (current && current.cls === cls) {
      current.norm += norm;
    } else {
      flush(offset);
      current = { cls, start: offset, norm };
    }
    offset += char.length;
  }
  flush(offset);
  return tokens;
}
