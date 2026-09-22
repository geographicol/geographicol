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

/** Output codes and names per style. */
export const STREET_OUTPUT: Record<StreetType, { igac: string; dian: string; readable: string }> = {
  CL: { igac: "CL", dian: "CL", readable: "Calle" },
  KR: { igac: "KR", dian: "CR", readable: "Carrera" },
  AV: { igac: "AV", dian: "AV", readable: "Avenida" },
  AK: { igac: "AK", dian: "AK", readable: "Avenida Carrera" },
  AC: { igac: "AC", dian: "AC", readable: "Avenida Calle" },
  DG: { igac: "DG", dian: "DG", readable: "Diagonal" },
  TV: { igac: "TV", dian: "TV", readable: "Transversal" },
  CIR: { igac: "CIR", dian: "CIR", readable: "Circular" },
  CCV: { igac: "CCV", dian: "CRV", readable: "Circunvalar" },
  AUTOP: { igac: "AUTOP", dian: "AUT", readable: "Autopista" },
  VIA: { igac: "VIA", dian: "VIA", readable: "Vía" },
  KM: { igac: "KM", dian: "KM", readable: "Kilómetro" },
};

export const QUADRANT_ALIASES: Record<string, Quadrant> = {
  sur: "SUR",
  este: "ESTE",
  norte: "NORTE",
  oeste: "OESTE",
  occidente: "OESTE",
  occ: "OESTE",
};

/** Single-letter quadrants, only when standing alone. */
export const SINGLE_LETTER_QUADRANTS: Record<string, Quadrant> = { s: "SUR", e: "ESTE" };

export const UNCOMMON_QUADRANTS: Quadrant[] = ["NORTE", "OESTE"];

/** Words that stand for "número". Dropped. */
export const NUMBER_MARKERS = ["no", "n", "nro", "num", "numero"];

export interface ComplementCode {
  type: ComplementType;
  igac: string;
  dian: string;
  readable: string;
  aliases: string[];
  /** Value runs to the next keyword, a comma or the end, instead of one token. */
  nameValued?: boolean;
}

export const COMPLEMENTS: ComplementCode[] = [
  {
    type: "APARTAMENTO",
    igac: "APTO",
    dian: "AP",
    readable: "Apartamento",
    aliases: ["apartamento", "aparta", "apto", "apt", "ap"],
  },
  { type: "TORRE", igac: "TO", dian: "TO", readable: "Torre", aliases: ["torre", "to", "tr"] },
  {
    type: "LOCAL",
    igac: "LC",
    dian: "LC",
    readable: "Local",
    aliases: ["local", "loc", "lc", "lo"],
  },
  {
    type: "OFICINA",
    igac: "OF",
    dian: "OF",
    readable: "Oficina",
    aliases: ["oficina", "ofi", "ofc", "of"],
  },
  { type: "PISO", igac: "PI", dian: "P", readable: "Piso", aliases: ["piso", "pi", "p"] },
  {
    type: "INTERIOR",
    igac: "IN",
    dian: "IN",
    readable: "Interior",
    aliases: ["interior", "int", "in"],
  },
  { type: "BLOQUE", igac: "BL", dian: "BL", readable: "Bloque", aliases: ["bloque", "blq", "bl"] },
  {
    type: "MANZANA",
    igac: "MZ",
    dian: "MZ",
    readable: "Manzana",
    aliases: ["manzana", "mza", "mz"],
  },
  { type: "CASA", igac: "CA", dian: "CA", readable: "Casa", aliases: ["casa", "ca"] },
  { type: "ETAPA", igac: "ET", dian: "ET", readable: "Etapa", aliases: ["etapa", "et"] },
  {
    type: "CONJUNTO",
    igac: "CONJ",
    dian: "CONJ",
    readable: "Conjunto",
    aliases: ["conjunto", "conj", "cj"],
    nameValued: true,
  },
  {
    type: "EDIFICIO",
    igac: "ED",
    dian: "ED",
    readable: "Edificio",
    aliases: ["edificio", "edif", "ed"],
    nameValued: true,
  },
  { type: "BODEGA", igac: "BG", dian: "BG", readable: "Bodega", aliases: ["bodega", "bod", "bg"] },
  { type: "LOTE", igac: "LT", dian: "LT", readable: "Lote", aliases: ["lote", "lt"] },
  {
    type: "BARRIO",
    igac: "BR",
    dian: "BRR",
    readable: "Barrio",
    aliases: ["barrio", "brr", "br", "bo"],
    nameValued: true,
  },
  // OTRO codes (section 9)
  { type: "OTRO", igac: "PH", dian: "PH", readable: "Penthouse", aliases: ["penthouse", "ph"] },
  { type: "OTRO", igac: "GJ", dian: "GJ", readable: "Garaje", aliases: ["garaje", "gj"] },
  { type: "OTRO", igac: "SS", dian: "SS", readable: "Semisótano", aliases: ["semisotano", "ss"] },
  { type: "OTRO", igac: "CS", dian: "CS", readable: "Consultorio", aliases: ["consultorio", "cs"] },
  { type: "OTRO", igac: "UN", dian: "UN", readable: "Unidad", aliases: ["unidad", "un"] },
  {
    type: "OTRO",
    igac: "URB",
    dian: "URB",
    readable: "Urbanización",
    aliases: ["urbanizacion", "urb"],
    nameValued: true,
  },
  {
    type: "OTRO",
    igac: "SEC",
    dian: "SEC",
    readable: "Sector",
    aliases: ["sector", "sec"],
    nameValued: true,
  },
  {
    type: "OTRO",
    igac: "LM",
    dian: "LM",
    readable: "Local mezzanine",
    aliases: ["local mezzanine", "lm"],
  },
  { type: "OTRO", igac: "MN", dian: "MN", readable: "Mezzanine", aliases: ["mezzanine", "mn"] },
  { type: "OTRO", igac: "TZ", dian: "TZ", readable: "Terraza", aliases: ["terraza", "tz"] },
  {
    type: "OTRO",
    igac: "CECO",
    dian: "CC",
    readable: "Centro comercial",
    aliases: ["centro comercial", "ceco", "cc"],
    nameValued: true,
  },
  { type: "OTRO", igac: "SU", dian: "SUITE", readable: "Suite", aliases: ["suite", "su"] },
  {
    type: "OTRO",
    igac: "AGN",
    dian: "AGP",
    readable: "Agrupación",
    aliases: ["agrupacion", "agn", "agp"],
    nameValued: true,
  },
  {
    type: "OTRO",
    igac: "VDA",
    dian: "VRD",
    readable: "Vereda",
    aliases: ["vereda", "vda", "vrd"],
    nameValued: true,
  },
  {
    type: "OTRO",
    igac: "SMZ",
    dian: "SM",
    readable: "Supermanzana",
    aliases: ["supermanzana", "smz", "sm"],
  },
  { type: "OTRO", igac: "PSJ", dian: "PJ", readable: "Pasaje", aliases: ["pasaje", "psj", "pj"] },
  {
    type: "OTRO",
    igac: "PT",
    dian: "POR",
    readable: "Portería",
    aliases: ["porteria", "pt", "por"],
  },
];

export const COMPLEMENT_BY_IGAC: Record<string, ComplementCode> = Object.fromEntries(
  COMPLEMENTS.map((c) => [c.igac, c]),
);

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
  UNCOMMON_QUADRANT: 0,
  LOCALITY_UNVERIFIED: 0,
};

/** Warnings whose penalty applies once, however often they are raised. */
export const ONCE_ONLY = ["AMBIGUOUS_STREET_TYPE", "LOCALITY_UNVERIFIED"];
