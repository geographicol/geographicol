"""Every code table lives here, so a correction is a one-line change.

See docs/nomenclature.md sections 3, 5, 7 and 9.
"""

from __future__ import annotations

from dataclasses import dataclass

from .types import ComplementType, Quadrant, StreetType

# Input aliases, already normalized (lowercase, no accents). Multi-word aliases are space-separated.
STREET_ALIASES: dict[StreetType, list[str]] = {
    "CL": ["calle", "cll", "cl", "cle", "c"],
    "KR": ["carrera", "cra", "cr", "kr", "kra", "k"],
    "AV": ["avenida", "av", "avda"],
    "AK": ["avenida carrera", "av carrera", "av cra", "av kr", "ak"],
    "AC": ["avenida calle", "av calle", "av cl", "ac"],
    "DG": ["diagonal", "diag", "dg"],
    "TV": ["transversal", "transv", "trans", "tv", "tr"],
    "CIR": ["circular", "circ", "cir", "cq"],
    "CCV": ["circunvalar", "cvlar", "ccv", "crv", "cv"],
    "AUTOP": ["autopista", "autop", "auto", "aut"],
    "VIA": ["via"],
    "KM": ["kilometro", "km"],
}

# Output codes and names per style.
STREET_OUTPUT: dict[StreetType, dict[str, str]] = {
    "CL": {"igac": "CL", "dian": "CL", "readable": "Calle"},
    "KR": {"igac": "KR", "dian": "CR", "readable": "Carrera"},
    "AV": {"igac": "AV", "dian": "AV", "readable": "Avenida"},
    "AK": {"igac": "AK", "dian": "AK", "readable": "Avenida Carrera"},
    "AC": {"igac": "AC", "dian": "AC", "readable": "Avenida Calle"},
    "DG": {"igac": "DG", "dian": "DG", "readable": "Diagonal"},
    "TV": {"igac": "TV", "dian": "TV", "readable": "Transversal"},
    "CIR": {"igac": "CIR", "dian": "CIR", "readable": "Circular"},
    "CCV": {"igac": "CCV", "dian": "CRV", "readable": "Circunvalar"},
    "AUTOP": {"igac": "AUTOP", "dian": "AUT", "readable": "Autopista"},
    "VIA": {"igac": "VIA", "dian": "VIA", "readable": "Vía"},
    "KM": {"igac": "KM", "dian": "KM", "readable": "Kilómetro"},
}

QUADRANT_ALIASES: dict[str, Quadrant] = {
    "sur": "SUR",
    "este": "ESTE",
    "norte": "NORTE",
    "oeste": "OESTE",
    "occidente": "OESTE",
    "occ": "OESTE",
}

# Single-letter quadrants, only when standing alone.
SINGLE_LETTER_QUADRANTS: dict[str, Quadrant] = {"s": "SUR", "e": "ESTE"}

UNCOMMON_QUADRANTS: tuple[Quadrant, ...] = ("NORTE", "OESTE")

# Words that stand for "número". Dropped.
NUMBER_MARKERS: tuple[str, ...] = ("no", "n", "nro", "num", "numero")


@dataclass(frozen=True)
class ComplementCode:
    type: ComplementType
    igac: str
    dian: str
    readable: str
    aliases: tuple[str, ...]
    name_valued: bool = False
    """Value runs to the next keyword, a comma or the end, instead of one token."""


def _c(
    type: ComplementType,
    igac: str,
    dian: str,
    readable: str,
    aliases: str,
    name_valued: bool = False,
) -> ComplementCode:
    return ComplementCode(type, igac, dian, readable, tuple(aliases.split(",")), name_valued)


COMPLEMENTS: list[ComplementCode] = [
    _c("APARTAMENTO", "APTO", "AP", "Apartamento", "apartamento,aparta,apto,apt,ap"),
    _c("TORRE", "TO", "TO", "Torre", "torre,to,tr"),
    _c("LOCAL", "LC", "LC", "Local", "local,loc,lc,lo"),
    _c("OFICINA", "OF", "OF", "Oficina", "oficina,ofi,ofc,of"),
    _c("PISO", "PI", "P", "Piso", "piso,pi,p"),
    _c("INTERIOR", "IN", "IN", "Interior", "interior,int,in"),
    _c("BLOQUE", "BL", "BL", "Bloque", "bloque,blq,bl"),
    _c("MANZANA", "MZ", "MZ", "Manzana", "manzana,mza,mz"),
    _c("CASA", "CA", "CA", "Casa", "casa,ca"),
    _c("ETAPA", "ET", "ET", "Etapa", "etapa,et"),
    _c("CONJUNTO", "CONJ", "CONJ", "Conjunto", "conjunto,conj,cj", name_valued=True),
    _c("EDIFICIO", "ED", "ED", "Edificio", "edificio,edif,ed", name_valued=True),
    _c("BODEGA", "BG", "BG", "Bodega", "bodega,bod,bg"),
    _c("LOTE", "LT", "LT", "Lote", "lote,lt"),
    _c("BARRIO", "BR", "BRR", "Barrio", "barrio,brr,br,bo", name_valued=True),
    # OTRO codes (section 9)
    _c("OTRO", "PH", "PH", "Penthouse", "penthouse,ph"),
    _c("OTRO", "GJ", "GJ", "Garaje", "garaje,gj"),
    _c("OTRO", "SS", "SS", "Semisótano", "semisotano,ss"),
    _c("OTRO", "CS", "CS", "Consultorio", "consultorio,cs"),
    _c("OTRO", "UN", "UN", "Unidad", "unidad,un"),
    _c("OTRO", "URB", "URB", "Urbanización", "urbanizacion,urb", name_valued=True),
    _c("OTRO", "SEC", "SEC", "Sector", "sector,sec", name_valued=True),
    _c("OTRO", "LM", "LM", "Local mezzanine", "local mezzanine,lm"),
    _c("OTRO", "MN", "MN", "Mezzanine", "mezzanine,mn"),
    _c("OTRO", "TZ", "TZ", "Terraza", "terraza,tz"),
    _c("OTRO", "CECO", "CC", "Centro comercial", "centro comercial,ceco,cc", name_valued=True),
    _c("OTRO", "SU", "SUITE", "Suite", "suite,su"),
    _c("OTRO", "AGN", "AGP", "Agrupación", "agrupacion,agn,agp", name_valued=True),
    _c("OTRO", "VDA", "VRD", "Vereda", "vereda,vda,vrd", name_valued=True),
    _c("OTRO", "SMZ", "SM", "Supermanzana", "supermanzana,smz,sm"),
    _c("OTRO", "PSJ", "PJ", "Pasaje", "pasaje,psj,pj"),
    _c("OTRO", "PT", "POR", "Portería", "porteria,pt,por"),
]

COMPLEMENT_BY_IGAC: dict[str, ComplementCode] = {c.igac: c for c in COMPLEMENTS}

# Confidence penalties (section 11).
PENALTIES: dict[str, float] = {
    "UNRECOGNIZED_STREET_TYPE": 0.5,
    "MISSING_CROSS_NUMBER": 0.4,
    "AMBIGUOUS_PLATE": 0.2,
    "UNKNOWN_TOKEN": 0.15,
    "RURAL_ADDRESS": 0.1,
    "MISSING_PLATE_NUMBER": 0.2,
    "MISSING_STREET_NUMBER": 0.4,
    "NAMED_STREET": 0,
    "AMBIGUOUS_STREET_TYPE": 0.1,
    "AMBIGUOUS_QUADRANT": 0.05,
    "UNCOMMON_QUADRANT": 0,
    "LOCALITY_UNVERIFIED": 0,
}

# Warnings whose penalty applies once, however often they are raised.
ONCE_ONLY: tuple[str, ...] = ("AMBIGUOUS_STREET_TYPE", "LOCALITY_UNVERIFIED")
