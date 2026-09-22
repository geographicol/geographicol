from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

StreetType = Literal["CL", "KR", "AV", "AK", "AC", "DG", "TV", "CIR", "CCV", "AUTOP", "VIA", "KM"]
Quadrant = Literal["SUR", "ESTE", "NORTE", "OESTE"]
ComplementType = Literal[
    "APARTAMENTO",
    "TORRE",
    "LOCAL",
    "OFICINA",
    "PISO",
    "INTERIOR",
    "BLOQUE",
    "MANZANA",
    "CASA",
    "ETAPA",
    "CONJUNTO",
    "EDIFICIO",
    "BODEGA",
    "LOTE",
    "BARRIO",
    "OTRO",
]
Style = Literal["igac", "dian", "readable"]


@dataclass(frozen=True)
class Complement:
    type: ComplementType
    code: str
    """IGAC code, whatever the output style: "APTO", "TO", "PH", ..."""
    value: str


@dataclass
class ParsedAddress:
    # Vía principal
    street_type: StreetType | None = None
    street_number: int | None = None
    street_letter: str | None = None
    street_quadrant: Quadrant | None = None

    # Placa
    cross_number: int | None = None
    cross_letter: str | None = None
    cross_quadrant: Quadrant | None = None
    plate_number: int | None = None

    complements: list[Complement] = field(default_factory=list)

    locality: str | None = None
    department: str | None = None

    canonical: str = ""
    normalized: str = ""
    confidence: float = 0.0
    warnings: list[str] = field(default_factory=list)
    raw: str = ""
