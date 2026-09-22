"""Step 4 of the parsing procedure (docs/nomenclature.md section 12)."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Literal

CharClass = Literal["letter", "digit", "separator"]

_LETTERS = set("abcdefghijklmnopqrstuvwxyzñ")
_DIGITS = set("0123456789")


@dataclass(frozen=True)
class Token:
    norm: str
    """Lowercase, accents stripped (ñ kept). Used for matching."""
    orig: str
    """The same characters as they appear in the input."""
    is_num: bool
    attached: bool
    """True when no separator stands between this token and the previous one: the "A" in "45A"."""
    start: int
    end: int


def normalize_char(char: str) -> str:
    """Normalizes one character for matching."""
    if char in ("ñ", "Ñ"):
        return "ñ"
    if char in ("º", "°"):
        return "o"
    decomposed = unicodedata.normalize("NFD", char)
    # Drop every combining mark (Unicode category M), matching /\p{M}/u in the Node library.
    return "".join(c for c in decomposed if not unicodedata.category(c).startswith("M")).lower()


def _classify(norm: str) -> CharClass:
    if norm in _LETTERS:
        return "letter"
    if norm in _DIGITS:
        return "digit"
    return "separator"


def tokenize(text: str) -> list[Token]:
    """Splits on spaces, "#", hyphens, dashes, periods and any other punctuation,
    and on letter-digit boundaries: "KR45" -> "KR", "45" and "45A" -> "45", "A".
    """
    tokens: list[Token] = []
    cls: CharClass | None = None
    start = 0
    norm = ""
    last_end = -1

    def flush(end: int) -> None:
        nonlocal cls, last_end
        if cls is None:
            return
        tokens.append(
            Token(
                norm=norm,
                orig=text[start:end],
                is_num=cls == "digit",
                attached=bool(tokens) and start == last_end,
                start=start,
                end=end,
            )
        )
        last_end = end
        cls = None

    for offset, char in enumerate(text):
        char_norm = normalize_char(char)
        char_cls = _classify(char_norm)
        if char_cls == "separator":
            flush(offset)
        elif cls == char_cls:
            norm += char_norm
        else:
            flush(offset)
            cls, start, norm = char_cls, offset, char_norm
    flush(len(text))
    return tokens
