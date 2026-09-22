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


def normalize(input: str, style: Style = "igac", strict: bool = False) -> str:
    """The canonical string for ``input``: ``parse(input, style, strict).canonical``."""
    return parse(input, style=style, strict=strict).canonical


def is_valid(input: str) -> bool:
    """True when confidence is at least 0.7 and both the street and cross numbers are present."""
    result = parse(input)
    return (
        result.confidence >= 0.7
        and result.street_number is not None
        and result.cross_number is not None
    )
