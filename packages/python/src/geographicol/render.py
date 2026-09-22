"""Output styles (docs/nomenclature.md section 10)."""

from __future__ import annotations

from .codes import COMPLEMENT_BY_CODE, STREET_OUTPUT
from .types import ParsedAddress, Style

_SMALL_WORDS = {"de", "del", "la", "las", "los", "el", "y"}


def _number_with_suffix(n: int, suffix: str | None, bis: str) -> str:
    """ "38" + "A BIS" -> "38A BIS": a leading single letter attaches to the number."""
    if not suffix:
        return str(n)
    parts = [bis if p == "BIS" else p for p in suffix.split(" ")]
    out = str(n)
    if len(parts[0]) == 1:
        out += parts[0]
        parts = parts[1:]
    return " ".join([out, *parts])


def _title_case(word: str) -> str:
    return word[0] + word[1:].lower()


def _name_title_case(name: str) -> str:
    """ "DE LA FACTORÍA" -> "de la Factoría": Spanish small words stay lowercase."""
    words = name.lower().split(" ")
    return " ".join(w if w in _SMALL_WORDS else w[:1].upper() + w[1:] for w in words)


def _street_part(a: ParsedAddress, titled: bool, bis: str) -> str | None:
    if a.street_name is not None:
        return _name_title_case(a.street_name) if titled else a.street_name
    if a.street_number is not None:
        return _number_with_suffix(a.street_number, a.street_letter, bis)
    return None


def _render_codes(a: ParsedAddress, style: str) -> str:
    titled = style == "igac"

    def quadrant(q: str) -> str:
        return _title_case(q) if titled else q

    parts: list[str] = []
    if a.street_type:
        parts.append(STREET_OUTPUT[a.street_type][style])
    street = _street_part(a, titled, "BIS")
    if street is not None:
        parts.append(street)
    if a.street_quadrant:
        parts.append(quadrant(a.street_quadrant))
    if a.cross_number is not None:
        parts.append(_number_with_suffix(a.cross_number, a.cross_letter, "BIS"))
    if a.plate_number is not None:
        parts.append(str(a.plate_number))
    if a.cross_quadrant:
        parts.append(quadrant(a.cross_quadrant))
    for c in a.complements:
        code = COMPLEMENT_BY_CODE.get(c.code)
        parts += [getattr(code, style) if code else c.code, c.value]
    return " ".join(parts)


def _render_readable(a: ParsedAddress) -> str:
    head: list[str] = []
    if a.street_type:
        head.append(STREET_OUTPUT[a.street_type]["readable"])
    street = _street_part(a, True, "Bis")
    if street is not None:
        head.append(street)
    if a.street_quadrant:
        head.append(_title_case(a.street_quadrant))
    out = " ".join(head)

    if a.cross_number is not None:
        cross = _number_with_suffix(a.cross_number, a.cross_letter, "Bis")
        if a.plate_number is not None:
            cross += f"-{a.plate_number}"
        if a.cross_quadrant:
            cross += f" {_title_case(a.cross_quadrant)}"
        out = f"{out} # {cross}" if out else f"# {cross}"
    for c in a.complements:
        code = COMPLEMENT_BY_CODE.get(c.code)
        out += f", {code.readable if code else c.code} {c.value}"
    return out


def render(address: ParsedAddress, style: Style) -> str:
    return _render_readable(address) if style == "readable" else _render_codes(address, style)
