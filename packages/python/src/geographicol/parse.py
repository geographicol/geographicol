"""The parsing procedure from docs/nomenclature.md section 12, step by step."""

from __future__ import annotations

from .codes import (
    AMBIGUOUS_COMPLEMENT_ALIASES,
    CALLE_LIKE,
    CARRERA_LIKE,
    COMPLEMENTS,
    NUMBER_MARKERS,
    ONCE_ONLY,
    PENALTIES,
    QUADRANT_ALIASES,
    SINGLE_LETTER_QUADRANTS,
    STREET_ALIASES,
    UNCOMMON_QUADRANTS,
    ComplementCode,
)
from .render import render
from .tokenize import Token, tokenize
from .types import Complement, ParsedAddress, Quadrant, StreetType, Style

# Street aliases as token lists, longest first so "avenida carrera" wins over "avenida".
_STREET_MATCHERS: list[tuple[StreetType, list[str]]] = sorted(
    (
        (street_type, alias.split(" "))
        for street_type, aliases in STREET_ALIASES.items()
        for alias in aliases
    ),
    key=lambda m: -len(m[1]),
)

_COMPLEMENT_MATCHERS: list[tuple[ComplementCode, list[str]]] = sorted(
    ((code, alias.split(" ")) for code in COMPLEMENTS for alias in code.aliases),
    key=lambda m: -len(m[1]),
)


class _AddressParser:
    def __init__(self, raw: str) -> None:
        self.raw = raw
        self.tokens: list[Token] = []
        self.i = 0
        self.a = ParsedAddress(raw=raw)
        self.raised: list[str] = []
        """Every warning occurrence, in order. Penalties are counted from this list."""

    def run(self) -> None:
        segments = self.raw.split(",")
        self._parse_address_segment(segments[0])
        for segment in segments[1:]:
            self._parse_extra_segment(segment)

        if self.a.locality is not None or self.a.department is not None:
            self._warn("LOCALITY_UNVERIFIED")

    def _warn(self, code: str) -> None:
        self.raised.append(code)

    def _peek(self, offset: int = 0) -> Token | None:
        index = self.i + offset
        return self.tokens[index] if index < len(self.tokens) else None

    # Steps 5 to 9, on the text before the first comma.
    def _parse_address_segment(self, text: str) -> None:
        self.tokens = tokenize(text)
        self.i = 0
        a = self.a

        a.street_type = self._parse_street_type()
        if a.street_type is None:
            self._warn("UNRECOGNIZED_STREET_TYPE")

        if a.street_type is not None and self._is_named_street():
            a.street_name = self._read_street_name()
            self._warn("NAMED_STREET")
        else:
            a.street_number = self._parse_number(3)
            if a.street_number is not None:
                a.street_letter = self._parse_suffix()
                a.street_quadrant = self._parse_quadrant()
        if a.street_number is None and a.street_name is None:
            self._warn("MISSING_STREET_NUMBER")

        if a.street_type == "KM":
            self._warn("RURAL_ADDRESS")
            # A KM address is a road location: the rest is the road description.
            rest = self._peek()
            if rest:
                a.locality = text[rest.start :].strip()
            self.i = len(self.tokens)
        else:
            self._parse_placa()

        if a.cross_number is None:
            self._warn("MISSING_CROSS_NUMBER")
        elif a.plate_number is None:
            self._warn("MISSING_PLATE_NUMBER")

        self._parse_complements_and_leftovers(text, locality_allowed=True)

    # Step 3: a later comma segment is complements, or else locality, then department.
    def _parse_extra_segment(self, text: str) -> None:
        self.tokens = tokenize(text)
        self.i = 0
        if not self.tokens:
            return
        if self._match_complement():
            self._parse_complements_and_leftovers(text, locality_allowed=False)
            return
        value = text.strip()
        if self.a.locality is None:
            self.a.locality = value
        elif self.a.department is None:
            self.a.department = value
        else:
            for _ in self.tokens:
                self._warn("UNKNOWN_TOKEN")

    # Step 5.
    def _parse_street_type(self) -> StreetType | None:
        for street_type, words in _STREET_MATCHERS:
            if self._matches_words(words):
                self.i += len(words)
                if len(words) == 1 and len(words[0]) == 1:
                    self._warn("AMBIGUOUS_STREET_TYPE")
                return street_type
        return None

    def _matches_words(self, words: list[str]) -> bool:
        for k, word in enumerate(words):
            token = self._peek(k)
            if token is None or token.is_num or token.norm != word:
                return False
        return True

    @staticmethod
    def _is_number_marker(token: Token | None) -> bool:
        return token is not None and not token.is_num and token.norm in NUMBER_MARKERS

    def _is_named_street(self) -> bool:
        """A word right after the street type, other than a number marker, starts a street name."""
        token = self._peek()
        return token is not None and not token.is_num and not self._is_number_marker(token)

    def _read_street_name(self) -> str:
        """Words up to the first number or number marker: "BOYACÁ", "DE LA FACTORÍA"."""
        words: list[str] = []
        while (token := self._peek()) and not token.is_num and not self._is_number_marker(token):
            words.append(token.orig)
            self.i += 1
        return " ".join(words).upper()

    def _parse_number(self, max_digits: int) -> int | None:
        token = self._peek()
        if token is None or not token.is_num or len(token.norm) > max_digits:
            return None
        self.i += 1
        return int(token.norm)

    # Letters and BIS after a number (section 4).
    def _parse_suffix(self) -> str | None:
        parts: list[str] = []
        while (token := self._peek()) and not token.is_num:
            if token.norm == "bis":
                parts.append("BIS")
            elif len(token.norm) == 1 and "a" <= token.norm <= "z":
                # N is never a letter: attached it is NORTE, alone it means "número".
                # Standing alone, S and E are quadrants.
                if token.norm == "n":
                    break
                if not token.attached and token.norm in SINGLE_LETTER_QUADRANTS:
                    break
                parts.append(token.norm.upper())
            else:
                break
            self.i += 1
        return " ".join(parts) if parts else None

    # Section 5.
    def _parse_quadrant(self) -> Quadrant | None:
        token = self._peek()
        if token is None or token.is_num:
            return None
        quadrant = QUADRANT_ALIASES.get(token.norm)
        if quadrant is None and not token.attached:
            quadrant = SINGLE_LETTER_QUADRANTS.get(token.norm)
            if quadrant:
                self._warn("AMBIGUOUS_QUADRANT")
        if quadrant is None and token.attached and token.norm == "n":
            # Cali's "6N": an attached N is NORTE.
            quadrant = "NORTE"
            self._warn("AMBIGUOUS_QUADRANT")
        if quadrant is None:
            return None
        if quadrant in UNCOMMON_QUADRANTS:
            self._warn("UNCOMMON_QUADRANT")
        self.i += 1
        return quadrant

    # Steps 6-7: number markers, cross street, plate (section 6).
    def _parse_placa(self) -> None:
        a = self.a
        while self._is_number_marker(self._peek()):
            self.i += 1

        block = self._peek()
        if block is None or not block.is_num:
            return
        if len(block.norm) >= 5:
            return  # left for the leftovers step: UNKNOWN_TOKEN
        self.i += 1
        a.cross_letter = self._parse_suffix()
        a.cross_quadrant = self._parse_quadrant()

        plate = self._peek()
        plate_follows = plate is not None and plate.is_num and len(plate.norm) <= 3
        if (
            not plate_follows
            and a.cross_letter is None
            and a.cross_quadrant is None
            and len(block.norm) >= 3
        ):
            # Glued cross and plate: "1230" -> 12 and 30.
            a.cross_number = int(block.norm[:-2])
            a.plate_number = int(block.norm[-2:])
            self._warn("AMBIGUOUS_PLATE")
        else:
            a.cross_number = int(block.norm)
            if plate_follows and plate is not None:
                self.i += 1
                a.plate_number = int(plate.norm)
        if a.cross_quadrant is None:
            self._parse_trailing_quadrant()

    def _parse_trailing_quadrant(self) -> None:
        """A quadrant after the plate follows the kind of street it describes (section 5)."""
        a = self.a
        quadrant = self._parse_quadrant()
        if quadrant is None:
            return
        street = a.street_type
        belongs_to_street = (
            a.street_quadrant is None
            and street is not None
            and (
                (quadrant == "SUR" and street in CALLE_LIKE)
                or (quadrant == "ESTE" and street in CARRERA_LIKE)
            )
        )
        if belongs_to_street:
            a.street_quadrant = quadrant
        else:
            a.cross_quadrant = quadrant

    def _match_complement(self) -> tuple[ComplementCode, int, str] | None:
        for code, words in _COMPLEMENT_MATCHERS:
            if not self._matches_words(words):
                continue
            alias = " ".join(words)
            following = self._peek(len(words))
            # "tr" is Torre only once the placa is parsed; "p" and "l" only before a number.
            if alias == "tr" and self.a.cross_number is None:
                continue
            if alias in ("p", "l") and (following is None or not following.is_num):
                continue
            return code, len(words), alias
        return None

    # Steps 8-9.
    def _parse_complements_and_leftovers(self, text: str, locality_allowed: bool) -> None:
        while self._peek():
            match = self._match_complement()
            if match:
                code, length, alias = match
                self.i += length
                if alias in AMBIGUOUS_COMPLEMENT_ALIASES:
                    self._warn("AMBIGUOUS_COMPLEMENT")
                value = self._read_name_value() if code.name_valued else self._read_token_value()
                if value is None:
                    self._warn("UNKNOWN_TOKEN")
                    continue
                self.a.complements.append(
                    Complement(type=code.type, code=code.catastral, value=value)
                )
                continue

            rest = self.tokens[self.i :]
            all_words = all(not token.is_num for token in rest)
            if (
                locality_allowed
                and all_words
                and self.a.cross_number is not None
                and self.a.locality is None
            ):
                self.a.locality = text[rest[0].start :].strip()
                self.i = len(self.tokens)
                return
            self._warn("UNKNOWN_TOKEN")
            self.i += 1

    def _read_token_value(self) -> str | None:
        """One token, plus any tokens attached to it: "501B"."""
        first = self._peek()
        if first is None or self._match_complement():
            return None
        value = first.orig
        self.i += 1
        while (token := self._peek()) and token.attached:
            value += token.orig
            self.i += 1
        return value.upper()

    def _read_name_value(self) -> str | None:
        """Words up to the next complement keyword or the end: "SAN FERNANDO"."""
        words: list[str] = []
        while (token := self._peek()) and not self._match_complement():
            words.append(token.orig)
            self.i += 1
        return " ".join(words).upper() if words else None


def _score(raised: list[str], strict: bool) -> float:
    penalty = 0.0
    counted: set[str] = set()
    for code in raised:
        if code in ONCE_ONLY and code in counted:
            continue
        counted.add(code)
        penalty += PENALTIES.get(code, 0)
    if strict:
        penalty *= 2
    return min(1.0, max(0.0, 1 - penalty))


def parse(input: str, style: Style = "catastral", strict: bool = False) -> ParsedAddress:
    """Parses a Colombian address.

    Never raises: unparseable input gets confidence 0 and warnings instead.
    """
    if input.strip() == "":
        return ParsedAddress(warnings=["EMPTY_INPUT"], raw=input)

    parser = _AddressParser(input)
    parser.run()
    address = parser.a
    address.canonical = render(address, style)
    address.normalized = render(address, "readable")
    address.confidence = _score(parser.raised, strict)
    address.warnings = list(dict.fromkeys(parser.raised))
    return address
