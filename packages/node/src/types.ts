export type StreetType =
  | "CL"
  | "KR"
  | "AV"
  | "AK"
  | "AC"
  | "DG"
  | "TV"
  | "CIR"
  | "CCV"
  | "AUTOP"
  | "VIA"
  | "KM";

export type Quadrant = "SUR" | "ESTE" | "NORTE" | "OESTE";

export type ComplementType =
  | "APARTAMENTO"
  | "TORRE"
  | "LOCAL"
  | "OFICINA"
  | "PISO"
  | "INTERIOR"
  | "BLOQUE"
  | "MANZANA"
  | "CASA"
  | "ETAPA"
  | "CONJUNTO"
  | "EDIFICIO"
  | "BODEGA"
  | "LOTE"
  | "BARRIO"
  | "OTRO";

export interface Complement {
  type: ComplementType;
  /** Catastral code, whatever the output style: "APTO", "TO", "PH", ... */
  code: string;
  value: string;
}

export interface ParsedAddress {
  // Vía principal
  streetType: StreetType | null;
  streetNumber: number | null;
  /** The name of a named street ("BOYACÁ"), when there is no number. */
  streetName: string | null;
  streetLetter: string | null;
  streetQuadrant: Quadrant | null;

  // Placa
  crossNumber: number | null;
  crossLetter: string | null;
  crossQuadrant: Quadrant | null;
  plateNumber: number | null;

  complements: Complement[];

  locality: string | null;
  department: string | null;

  canonical: string;
  normalized: string;
  confidence: number;
  warnings: string[];
  raw: string;
}

export type Style = "catastral" | "igac" | "dian" | "readable";

export interface ParseOptions {
  /** Canonical string style. Default "catastral". */
  style?: Style;
  /** Double every confidence penalty. */
  strict?: boolean;
}
