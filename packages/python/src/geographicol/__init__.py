"""Normalize Colombian addresses into a canonical, structured form."""

from __future__ import annotations

from .parse import parse
from .types import Complement, ComplementType, ParsedAddress, Quadrant, StreetType, Style

__all__ = [
    "Complement",
    "ComplementType",
    "ParsedAddress",
    "Quadrant",
    "StreetType",
    "Style",
    "is_valid",
    "normalize",
    "parse",
]


def normalize(input: str, style: Style = "catastral", strict: bool = False) -> str:
    """The canonical string for ``input``: ``parse(input, style, strict).canonical``."""
    return parse(input, style=style, strict=strict).canonical


def is_valid(input: str) -> bool:
    """True when confidence is 0.7 or more, with a cross number and a street number or name."""
    result = parse(input)
    has_street = result.street_number is not None or result.street_name is not None
    return result.confidence >= 0.7 and has_street and result.cross_number is not None
