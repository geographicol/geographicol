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

# Output per style. "igac" follows IGAC's 2024 manual: full words, no abbreviations.
STREET_OUTPUT: dict[StreetType, dict[str, str]] = {
    "CL": {"catastral": "CL", "igac": "Calle", "dian": "CL", "readable": "Calle"},
    "KR": {"catastral": "KR", "igac": "Carrera", "dian": "CR", "readable": "Carrera"},
    "AV": {"catastral": "AV", "igac": "Avenida", "dian": "AV", "readable": "Avenida"},
    "AK": {
        "catastral": "AK",
        "igac": "Avenida Carrera",
        "dian": "AK",
        "readable": "Avenida Carrera",
    },
    "AC": {"catastral": "AC", "igac": "Avenida Calle", "dian": "AC", "readable": "Avenida Calle"},
    "DG": {"catastral": "DG", "igac": "Diagonal", "dian": "DG", "readable": "Diagonal"},
    "TV": {"catastral": "TV", "igac": "Transversal", "dian": "TV", "readable": "Transversal"},
    "CIR": {"catastral": "CIR", "igac": "Circular", "dian": "CIR", "readable": "Circular"},
    "CCV": {"catastral": "CCV", "igac": "Circunvalar", "dian": "CRV", "readable": "Circunvalar"},
    "AUTOP": {"catastral": "AUTOP", "igac": "Autopista", "dian": "AUT", "readable": "Autopista"},
    "VIA": {"catastral": "VIA", "igac": "Vía", "dian": "VIA", "readable": "Vía"},
    "KM": {"catastral": "KM", "igac": "KM", "dian": "KM", "readable": "Kilómetro"},
}

# Street kinds a trailing quadrant describes (section 5): SUR belongs to calles, ESTE to carreras.
CALLE_LIKE: tuple[StreetType, ...] = ("CL", "AC", "DG")
CARRERA_LIKE: tuple[StreetType, ...] = ("KR", "AK", "TV")

QUADRANT_ALIASES: dict[str, Quadrant] = {
    "sur": "SUR",
    "este": "ESTE",
    "norte": "NORTE",
    "oeste": "OESTE",
    "occidente": "OESTE",
    "occ": "OESTE",
}

# Single-letter quadrants, only when standing alone. An attached "n" is NORTE (see parse.py).
SINGLE_LETTER_QUADRANTS: dict[str, Quadrant] = {"s": "SUR", "e": "ESTE"}

UNCOMMON_QUADRANTS: tuple[Quadrant, ...] = ("NORTE", "OESTE")

# Words that stand for "número". Dropped.
NUMBER_MARKERS: tuple[str, ...] = ("no", "n", "nro", "num", "numero")


@dataclass(frozen=True)
class ComplementCode:
    type: ComplementType
    catastral: str
    igac: str
    dian: str
    readable: str
    aliases: tuple[str, ...]
    name_valued: bool = False
    """Value runs to the next keyword, a comma or the end, instead of one token."""


def _c(
    type: ComplementType,
    catastral: str,
    igac: str,
    dian: str,
    readable: str,
    aliases: str,
    name_valued: bool = False,
) -> ComplementCode:
    return ComplementCode(
        type, catastral, igac, dian, readable, tuple(aliases.split(",")), name_valued
    )


# Columns: catastral, igac (IGAC 2024 manual), dian. OTRO rows follow the 15 named types.
COMPLEMENTS: list[ComplementCode] = [
    _c("APARTAMENTO", "APTO", "AP", "AP", "Apartamento", "apartamento,aparta,apto,apt,ap"),
    _c("TORRE", "TO", "TO", "TO", "Torre", "torre,to,tr"),
    _c("LOCAL", "LC", "L", "LC", "Local", "local,loc,lc,lo,l"),
    _c("OFICINA", "OF", "OF", "OF", "Oficina", "oficina,ofi,ofc,of"),
    _c("PISO", "PI", "P", "P", "Piso", "piso,pi,p"),
    _c("INTERIOR", "IN", "IN", "IN", "Interior", "interior,int,in"),
    _c("BLOQUE", "BL", "BQ", "BL", "Bloque", "bloque,blq,bq,bl"),
    _c("MANZANA", "MZ", "MZ", "MZ", "Manzana", "manzana,mza,mz"),
    _c("CASA", "CA", "CS", "CA", "Casa", "casa,ca"),
    _c("ETAPA", "ET", "ET", "ET", "Etapa", "etapa,et"),
    _c("CONJUNTO", "CONJ", "CO", "CONJ", "Conjunto", "conjunto,conj,cj,co", name_valued=True),
    _c("EDIFICIO", "ED", "ED", "ED", "Edificio", "edificio,edif,ed", name_valued=True),
    _c("BODEGA", "BG", "BD", "BG", "Bodega", "bodega,bod,bd,bg"),
    _c("LOTE", "LT", "LO", "LT", "Lote", "lote,lt"),
    _c("BARRIO", "BR", "BR", "BRR", "Barrio", "barrio,brr,br,bo", name_valued=True),
    _c("OTRO", "PH", "PN", "PH", "Penthouse", "penthouse,ph,pn"),
    _c("OTRO", "GJ", "GA", "GJ", "Garaje", "garaje,gj,ga"),
    _c("OTRO", "SS", "SS", "SS", "Semisótano", "semisotano,ss"),
    _c("OTRO", "CS", "CON", "CS", "Consultorio", "consultorio,cs,con"),
    _c("OTRO", "UN", "UN", "UN", "Unidad", "unidad,un"),
    _c("OTRO", "URB", "UR", "URB", "Urbanización", "urbanizacion,urb,ur", name_valued=True),
    _c("OTRO", "SEC", "SC", "SEC", "Sector", "sector,sec,sc", name_valued=True),
    _c("OTRO", "LM", "LM", "LM", "Local mezzanine", "local mezzanine,lm"),
    _c("OTRO", "MN", "MN", "MN", "Mezzanine", "mezzanine,mn"),
    _c("OTRO", "TZ", "TZ", "TZ", "Terraza", "terraza,tz"),
    _c(
        "OTRO",
        "CECO",
        "CECO",
        "CC",
        "Centro comercial",
        "centro comercial,ceco,cc",
        name_valued=True,
    ),
    _c("OTRO", "SU", "SU", "SUITE", "Suite", "suite,su"),
    _c("OTRO", "AGN", "AGN", "AGP", "Agrupación", "agrupacion,agn,agp", name_valued=True),
    _c("OTRO", "VDA", "VDA", "VRD", "Vereda", "vereda,vda,vrd", name_valued=True),
    _c("OTRO", "SMZ", "SMZ", "SM", "Supermanzana", "supermanzana,smz,sm"),
    _c("OTRO", "PSJ", "PJ", "PJ", "Pasaje", "pasaje,psj,pj"),
    _c("OTRO", "PT", "PR", "POR", "Portería", "porteria,pt,por,pr"),
]

COMPLEMENT_BY_CODE: dict[str, ComplementCode] = {c.catastral: c for c in COMPLEMENTS}

# Aliases whose meaning differs between the tables (section 7): read as listed, but flagged.
AMBIGUOUS_COMPLEMENT_ALIASES: tuple[str, ...] = ("cs", "lo")

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
    "AMBIGUOUS_COMPLEMENT": 0.05,
    "UNCOMMON_QUADRANT": 0,
    "LOCALITY_UNVERIFIED": 0,
}

# Warnings whose penalty applies once, however often they are raised.
ONCE_ONLY: tuple[str, ...] = ("AMBIGUOUS_STREET_TYPE", "LOCALITY_UNVERIFIED")
