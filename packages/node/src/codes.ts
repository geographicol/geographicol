// Every code table lives here, so a correction is a one-line change.
// See docs/nomenclature.md sections 3, 5, 7 and 9.

import type { ComplementType, Quadrant, StreetType } from "./types.js";

/** Input aliases, already normalized (lowercase, no accents). Multi-word aliases are space-separated. */
export const STREET_ALIASES: Record<StreetType, string[]> = {
  CL: ["calle", "cll", "cl", "cle", "c"],
  KR: ["carrera", "cra", "cr", "kr", "kra", "k"],
  AV: ["avenida", "av", "avda"],
  AK: ["avenida carrera", "av carrera", "av cra", "av kr", "ak"],
  AC: ["avenida calle", "av calle", "av cl", "ac"],
  DG: ["diagonal", "diag", "dg"],
  TV: ["transversal", "transv", "trans", "tv", "tr"],
  CIR: ["circular", "circ", "cir", "cq"],
  CCV: ["circunvalar", "cvlar", "ccv", "crv", "cv"],
  AUTOP: ["autopista", "autop", "auto", "aut"],
  VIA: ["via"],
  KM: ["kilometro", "km"],
};

/** Output per style. `igac` follows IGAC's 2024 manual: full words, no abbreviations. */
export const STREET_OUTPUT: Record<
  StreetType,
  { catastral: string; igac: string; dian: string; readable: string }
> = {
  CL: { catastral: "CL", igac: "Calle", dian: "CL", readable: "Calle" },
  KR: { catastral: "KR", igac: "Carrera", dian: "CR", readable: "Carrera" },
  AV: { catastral: "AV", igac: "Avenida", dian: "AV", readable: "Avenida" },
  AK: { catastral: "AK", igac: "Avenida Carrera", dian: "AK", readable: "Avenida Carrera" },
  AC: { catastral: "AC", igac: "Avenida Calle", dian: "AC", readable: "Avenida Calle" },
  DG: { catastral: "DG", igac: "Diagonal", dian: "DG", readable: "Diagonal" },
  TV: { catastral: "TV", igac: "Transversal", dian: "TV", readable: "Transversal" },
  CIR: { catastral: "CIR", igac: "Circular", dian: "CIR", readable: "Circular" },
  CCV: { catastral: "CCV", igac: "Circunvalar", dian: "CRV", readable: "Circunvalar" },
  AUTOP: { catastral: "AUTOP", igac: "Autopista", dian: "AUT", readable: "Autopista" },
  VIA: { catastral: "VIA", igac: "Vía", dian: "VIA", readable: "Vía" },
  KM: { catastral: "KM", igac: "KM", dian: "KM", readable: "Kilómetro" },
};

/** Street kinds a trailing quadrant describes (section 5): SUR belongs to calles, ESTE to carreras. */
export const CALLE_LIKE: StreetType[] = ["CL", "AC", "DG"];
export const CARRERA_LIKE: StreetType[] = ["KR", "AK", "TV"];

export const QUADRANT_ALIASES: Record<string, Quadrant> = {
  sur: "SUR",
  este: "ESTE",
  norte: "NORTE",
  oeste: "OESTE",
  occidente: "OESTE",
  occ: "OESTE",
};

/** Single-letter quadrants, only when standing alone. An attached "n" is NORTE (see parse.ts). */
export const SINGLE_LETTER_QUADRANTS: Record<string, Quadrant> = { s: "SUR", e: "ESTE" };

export const UNCOMMON_QUADRANTS: Quadrant[] = ["NORTE", "OESTE"];

/** Words that stand for "número". Dropped. */
export const NUMBER_MARKERS = ["no", "n", "nro", "num", "numero"];

export interface ComplementCode {
  type: ComplementType;
  catastral: string;
  igac: string;
  dian: string;
  readable: string;
  aliases: string[];
  /** Value runs to the next keyword, a comma or the end, instead of one token. */
  nameValued?: boolean;
}

// Columns: catastral, igac (IGAC 2024 manual), dian. OTRO rows follow the 15 named types.
export const COMPLEMENTS: ComplementCode[] = [
  {
    type: "APARTAMENTO",
    catastral: "APTO",
    igac: "AP",
    dian: "AP",
    readable: "Apartamento",
    aliases: ["apartamento", "aparta", "apto", "apt", "ap"],
  },
  {
    type: "TORRE",
    catastral: "TO",
    igac: "TO",
    dian: "TO",
    readable: "Torre",
    aliases: ["torre", "to", "tr"],
  },
  {
    type: "LOCAL",
    catastral: "LC",
    igac: "L",
    dian: "LC",
    readable: "Local",
    aliases: ["local", "loc", "lc", "lo", "l"],
  },
  {
    type: "OFICINA",
    catastral: "OF",
    igac: "OF",
    dian: "OF",
    readable: "Oficina",
    aliases: ["oficina", "ofi", "ofc", "of"],
  },
  {
    type: "PISO",
    catastral: "PI",
    igac: "P",
    dian: "P",
    readable: "Piso",
    aliases: ["piso", "pi", "p"],
  },
  {
    type: "INTERIOR",
    catastral: "IN",
    igac: "IN",
    dian: "IN",
    readable: "Interior",
    aliases: ["interior", "int", "in"],
  },
  {
    type: "BLOQUE",
    catastral: "BL",
    igac: "BQ",
    dian: "BL",
    readable: "Bloque",
    aliases: ["bloque", "blq", "bq", "bl"],
  },
  {
    type: "MANZANA",
    catastral: "MZ",
    igac: "MZ",
    dian: "MZ",
    readable: "Manzana",
    aliases: ["manzana", "mza", "mz"],
  },
  {
    type: "CASA",
    catastral: "CA",
    igac: "CS",
    dian: "CA",
    readable: "Casa",
    aliases: ["casa", "ca"],
  },
  {
    type: "ETAPA",
    catastral: "ET",
    igac: "ET",
    dian: "ET",
    readable: "Etapa",
    aliases: ["etapa", "et"],
  },
  {
    type: "CONJUNTO",
    catastral: "CONJ",
    igac: "CO",
    dian: "CONJ",
    readable: "Conjunto",
    aliases: ["conjunto", "conj", "cj", "co"],
    nameValued: true,
  },
  {
    type: "EDIFICIO",
    catastral: "ED",
    igac: "ED",
    dian: "ED",
    readable: "Edificio",
    aliases: ["edificio", "edif", "ed"],
    nameValued: true,
  },
  {
    type: "BODEGA",
    catastral: "BG",
    igac: "BD",
    dian: "BG",
    readable: "Bodega",
    aliases: ["bodega", "bod", "bd", "bg"],
  },
  {
    type: "LOTE",
    catastral: "LT",
    igac: "LO",
    dian: "LT",
    readable: "Lote",
    aliases: ["lote", "lt"],
  },
  {
    type: "BARRIO",
    catastral: "BR",
    igac: "BR",
    dian: "BRR",
    readable: "Barrio",
    aliases: ["barrio", "brr", "br", "bo"],
    nameValued: true,
  },
  {
    type: "OTRO",
    catastral: "PH",
    igac: "PN",
    dian: "PH",
    readable: "Penthouse",
    aliases: ["penthouse", "ph", "pn"],
  },
  {
    type: "OTRO",
    catastral: "GJ",
    igac: "GA",
    dian: "GJ",
    readable: "Garaje",
    aliases: ["garaje", "gj", "ga"],
  },
  {
    type: "OTRO",
    catastral: "SS",
    igac: "SS",
    dian: "SS",
    readable: "Semisótano",
    aliases: ["semisotano", "ss"],
  },
  {
    type: "OTRO",
    catastral: "CS",
    igac: "CON",
    dian: "CS",
    readable: "Consultorio",
    aliases: ["consultorio", "cs", "con"],
  },
  {
    type: "OTRO",
    catastral: "UN",
    igac: "UN",
    dian: "UN",
    readable: "Unidad",
    aliases: ["unidad", "un"],
  },
  {
    type: "OTRO",
    catastral: "URB",
    igac: "UR",
    dian: "URB",
    readable: "Urbanización",
    aliases: ["urbanizacion", "urb", "ur"],
    nameValued: true,
  },
  {
    type: "OTRO",
    catastral: "SEC",
    igac: "SC",
    dian: "SEC",
    readable: "Sector",
    aliases: ["sector", "sec", "sc"],
    nameValued: true,
  },
  {
    type: "OTRO",
    catastral: "LM",
    igac: "LM",
    dian: "LM",
    readable: "Local mezzanine",
    aliases: ["local mezzanine", "lm"],
  },
  {
    type: "OTRO",
    catastral: "MN",
    igac: "MN",
    dian: "MN",
    readable: "Mezzanine",
    aliases: ["mezzanine", "mn"],
  },
  {
    type: "OTRO",
    catastral: "TZ",
    igac: "TZ",
    dian: "TZ",
    readable: "Terraza",
    aliases: ["terraza", "tz"],
  },
  {
    type: "OTRO",
    catastral: "CECO",
    igac: "CECO",
    dian: "CC",
    readable: "Centro comercial",
    aliases: ["centro comercial", "ceco", "cc"],
    nameValued: true,
  },
  {
    type: "OTRO",
    catastral: "SU",
    igac: "SU",
    dian: "SUITE",
    readable: "Suite",
    aliases: ["suite", "su"],
  },
  {
    type: "OTRO",
    catastral: "AGN",
    igac: "AGN",
    dian: "AGP",
    readable: "Agrupación",
    aliases: ["agrupacion", "agn", "agp"],
    nameValued: true,
  },
  {
    type: "OTRO",
    catastral: "VDA",
    igac: "VDA",
    dian: "VRD",
    readable: "Vereda",
    aliases: ["vereda", "vda", "vrd"],
    nameValued: true,
  },
  {
    type: "OTRO",
    catastral: "SMZ",
    igac: "SMZ",
    dian: "SM",
    readable: "Supermanzana",
    aliases: ["supermanzana", "smz", "sm"],
  },
  {
    type: "OTRO",
    catastral: "PSJ",
    igac: "PJ",
    dian: "PJ",
    readable: "Pasaje",
    aliases: ["pasaje", "psj", "pj"],
  },
  {
    type: "OTRO",
    catastral: "PT",
    igac: "PR",
    dian: "POR",
    readable: "Portería",
    aliases: ["porteria", "pt", "por", "pr"],
  },
];

export const COMPLEMENT_BY_CODE: Record<string, ComplementCode> = Object.fromEntries(
  COMPLEMENTS.map((c) => [c.catastral, c]),
);

/** Aliases whose meaning differs between the tables (section 7): read as listed, but flagged. */
export const AMBIGUOUS_COMPLEMENT_ALIASES = ["cs", "lo"];

/** Confidence penalties (section 11). */
export const PENALTIES: Record<string, number> = {
  UNRECOGNIZED_STREET_TYPE: 0.5,
  MISSING_CROSS_NUMBER: 0.4,
  AMBIGUOUS_PLATE: 0.2,
  UNKNOWN_TOKEN: 0.15,
  RURAL_ADDRESS: 0.1,
  MISSING_PLATE_NUMBER: 0.2,
  MISSING_STREET_NUMBER: 0.4,
  NAMED_STREET: 0,
  AMBIGUOUS_STREET_TYPE: 0.1,
  AMBIGUOUS_QUADRANT: 0.05,
  AMBIGUOUS_COMPLEMENT: 0.05,
  UNCOMMON_QUADRANT: 0,
  LOCALITY_UNVERIFIED: 0,
};

/** Warnings whose penalty applies once, however often they are raised. */
export const ONCE_ONLY = ["AMBIGUOUS_STREET_TYPE", "LOCALITY_UNVERIFIED"];
