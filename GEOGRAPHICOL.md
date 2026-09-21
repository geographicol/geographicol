# geographicol — Project Brief

> Read this whole file before writing any code. It is the source of truth for scope, structure and conventions. When something here conflicts with a default you'd normally pick, this file wins.

## What we are building

**geographicol** is a developer-facing product for Colombian geographic data. The first product is **address normalization**: turning the many ways Colombians write an address into a single canonical, structured form.

Colombian addresses do not use house numbers on named streets. They use a grid: a street type + number (the *vía principal*), then `#` + the cross street number + distance in meters (the *placa*), plus optional letter suffixes, `BIS`, `SUR`/`ESTE` quadrant markers, and complements (apartment, tower, office, block, etc.). The same address is written dozens of ways:

```
Carrera 45 # 12-30 Local 3
Cra 45 No 12 30 Loc 3
KR 45 12 30 LC 3
Cr. 45 #12 - 30, Local 3
carrera 45 numero 12-30 local 3
```

All of these must normalize to the same structured object and the same canonical string.

## Milestone 1 (this brief): the open-source "lite" libraries

Two libraries, identical behavior, one shared test fixture set:

- `@geographicol/address` — TypeScript, published to npm
- `geographicol` — Python 3.10+, published to PyPI

Scope of the lite libraries: **syntactic normalization only.** Pure functions, no network calls, no data files larger than a few KB, no geocoding, no city/neighborhood lookup, no fuzzy matching against real addresses. String in → structured object + canonical string out.

Anything that requires data or infrastructure is explicitly **out of scope** for the libraries and belongs to the API (Milestone 2).

### Why "lite"

The libraries are the free tier and the validation instrument. They should handle the common ~80% of real-world inputs cleanly and be honest about what they don't handle (return a `confidence` score and a `warnings` list rather than guessing silently). The hard 20% — ambiguous inputs, rural addresses, informal neighborhoods, typos — is what the paid API solves.

## Repository layout (monorepo)

```
geographicol/
├── GEOGRAPHICOL.md            ← this file
├── README.md                  ← brand-level readme (see "README requirements")
├── LICENSE                    ← MIT
├── fixtures/
│   ├── addresses.json         ← shared test cases, consumed by BOTH libraries
│   └── README.md              ← how to add a fixture
├── packages/
│   ├── node/                  ← @geographicol/address
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   └── python/                ← geographicol
│       ├── src/geographicol/
│       ├── tests/
│       ├── pyproject.toml
│       └── README.md
├── docs/
│   └── nomenclature.md        ← the rules, written for humans
└── .github/workflows/
    ├── node.yml
    └── python.yml
```

**The fixtures file is the contract.** Both libraries must pass 100% of `fixtures/addresses.json`. When a new edge case is found, it goes into the fixtures first, then both implementations are updated. Never fix a case in one language only.

## Public API (identical in both languages)

### `parse(input: string, options?) → ParsedAddress`

Returns a structured object. Never throws on unparseable input; returns `confidence: 0` and populates `warnings` instead.

```ts
interface ParsedAddress {
  // Vía principal (the street the address is on)
  streetType: StreetType | null;     // "CL" | "KR" | "AV" | "AK" | "AC" | "DG" | "TV" | "CQ" | ...
  streetNumber: number | null;
  streetLetter: string | null;       // "A", "B", "BIS", "BIS A", ...
  streetQuadrant: "SUR" | "ESTE" | null;

  // Placa (cross street + distance)
  crossNumber: number | null;
  crossLetter: string | null;
  crossQuadrant: "SUR" | "ESTE" | null;
  plateNumber: number | null;        // the "-30" in "#12-30"

  // Complements, in order of appearance
  complements: Array<{ type: ComplementType; value: string }>;
  // ComplementType: "APARTAMENTO" | "TORRE" | "LOCAL" | "OFICINA" | "PISO" |
  //   "INTERIOR" | "BLOQUE" | "MANZANA" | "CASA" | "ETAPA" | "CONJUNTO" |
  //   "EDIFICIO" | "BODEGA" | "LOTE" | "BARRIO" | "OTRO"

  // Anything after the address that looks like a place name
  locality: string | null;           // "Medellín", "Bogotá D.C." — NOT validated in the lite lib
  department: string | null;         // "Antioquia" — NOT validated in the lite lib

  // Output
  canonical: string;                 // DANE-style canonical string, see below
  normalized: string;                // human-readable normalized form
  confidence: number;                // 0..1
  warnings: string[];                // machine-readable codes, e.g. "AMBIGUOUS_STREET_TYPE"
  raw: string;                       // original input, untouched
}
```

### `normalize(input: string, options?) → string`

Convenience wrapper: `parse(input).canonical`.

### `isValid(input: string) → boolean`

`true` when `parse(input).confidence >= 0.7` and both `streetNumber` and `crossNumber` are present.

### Options

```ts
interface ParseOptions {
  style?: "dane" | "readable";   // canonical string style, default "dane"
  strict?: boolean;              // if true, unknown tokens lower confidence more aggressively
}
```

## Normalization rules

Full rules live in `docs/nomenclature.md` — write that file first, then implement from it. Summary of what must be handled:

### Street types and their aliases

| Canonical | Accepted inputs (case-insensitive, with or without trailing period) |
|---|---|
| `CL` | calle, cll, cl, cle, c |
| `KR` | carrera, cra, cr, kr, kra, k, cra. |
| `AV` | avenida, av, avda |
| `AK` | avenida carrera, av cra, av kr, ak |
| `AC` | avenida calle, av calle, av cl, ac |
| `DG` | diagonal, diag, dg |
| `TV` | transversal, transv, tv, tr, trans |
| `CQ` | circular, circ, cq |
| `CV` | circunvalar, cvlar |
| `AUT` | autopista, auto, aut |
| `VIA` | vía, via |
| `KM` | kilómetro, kilometro, km (rural — parse but flag `RURAL_ADDRESS`) |

> Verify the canonical two-letter codes against DANE's official address standardization document before publishing. If DANE's codes differ from the table above, DANE wins — update this table and the fixtures.

### Letters, BIS, quadrants

- Letter suffix: single letter A–Z immediately after a number, optionally separated by a space: `45A`, `45 A`, `45-A` → `streetLetter: "A"`
- `BIS` may appear alone or with a letter: `45 BIS`, `45 BIS A`, `45BIS`, `45 B BIS` — normalize to `"BIS"` or `"BIS A"`
- Quadrants: `SUR`, `ESTE` (also `S`, `E` when unambiguous, and `OESTE`/`NORTE` in a few cities — accept and flag `UNCOMMON_QUADRANT`)
- Quadrant applies to the nearest preceding number

### The `#` and plate

Accept all of: `#`, `No`, `No.`, `Nº`, `N°`, `numero`, `número`, `num`, or nothing (bare `KR 45 12 30`). Plate separator: `-`, `–`, space, or none (`12-30`, `12 30`, `1230` is **ambiguous** → attempt split, flag `AMBIGUOUS_PLATE`).

### Complements

Each complement is a keyword + value. Aliases:

| Type | Aliases |
|---|---|
| APARTAMENTO | apto, apt, ap, apartamento, aparta |
| TORRE | torre, to, tr (only when followed by a number/letter and a street type already parsed) |
| LOCAL | local, loc, lc, lo |
| OFICINA | oficina, ofc, of, ofi |
| PISO | piso, p (only when followed by a number) |
| INTERIOR | interior, int, in |
| BLOQUE | bloque, blq, bl |
| MANZANA | manzana, mz, mza |
| CASA | casa, cs, ca |
| ETAPA | etapa, et |
| CONJUNTO | conjunto, conj, cj |
| EDIFICIO | edificio, ed, edif |
| BODEGA | bodega, bg, bod |
| LOTE | lote, lt |
| BARRIO | barrio, br, bo, b/ |

Multiple complements are common: `Torre 2 Apto 501`. Preserve order.

### Canonical string (`style: "dane"`)

DANE-style: uppercase, abbreviated street type, zero-padded numbers, tokens separated by single spaces, no `#`, no `-`.

```
Avenida Carrera 73B Sur # 4 – 10 Torre 2   →  AK 73 B S 4 10 TO 2
Calle 78 Sur # 20D – 15                     →  CL 78 S 20 D 15
Carrera 45 # 12-30 Local 3                  →  KR 45 12 30 LC 3
```

> Exact DANE padding and complement codes must be verified against the official document. Implement the structure now; make padding and codes a single config table so they can be corrected in one place.

### Canonical string (`style: "readable"`)

```
Carrera 45 # 12-30, Local 3
Avenida Carrera 73B Sur # 4-10, Torre 2
```

### Locality / department

Anything after the last complement that is a comma-separated or trailing word sequence is captured as `locality` (and `department` if a second segment exists). **Do not validate** against a city list in the lite lib — just capture. Flag `LOCALITY_UNVERIFIED`.

### Confidence scoring

Start at 1.0. Subtract for each: unknown token (−0.15), ambiguous plate (−0.2), missing cross number (−0.4), rural/KM address (−0.1), unrecognized street type (−0.5). Clamp to [0, 1]. Document the exact table in `docs/nomenclature.md`.

## Fixtures

`fixtures/addresses.json` — array of:

```json
{
  "id": "kr-45-12-30-local-3-variants",
  "inputs": [
    "Carrera 45 # 12-30 Local 3",
    "Cra 45 No 12 30 Loc 3",
    "KR 45 12 30 LC 3",
    "Cr. 45 #12 - 30, Local 3",
    "carrera 45 numero 12-30 local 3"
  ],
  "expected": {
    "streetType": "KR",
    "streetNumber": 45,
    "crossNumber": 12,
    "plateNumber": 30,
    "complements": [{ "type": "LOCAL", "value": "3" }],
    "canonical": "KR 45 12 30 LC 3"
  },
  "minConfidence": 0.9
}
```

Start with **at least 60 fixture groups** covering: every street type, letters, BIS, both quadrants, every complement type, multi-complement, bare (no `#`) form, locality suffixes, and at least 10 deliberately messy/ambiguous inputs with `minConfidence` low and expected `warnings`.

Fixtures must include real-looking addresses from Bogotá, Medellín, Cali, Barranquilla, Cartagena and Bucaramanga — nomenclature quirks vary by city.

## Tooling

### Node (`packages/node`)
- TypeScript strict mode, ESM + CJS dual build via `tsup`
- Tests: `vitest`, fixtures loaded from `../../fixtures/addresses.json`
- Lint/format: `biome`
- Zero runtime dependencies
- `package.json` name `@geographicol/address`, `"sideEffects": false`, `"files": ["dist"]`
- Export types

### Python (`packages/python`)
- `pyproject.toml` with `hatchling`, package name `geographicol`, Python `>=3.10`
- Tests: `pytest`, fixtures loaded from `../../fixtures/addresses.json`
- Lint/format: `ruff`
- Type hints everywhere, `py.typed` marker, dataclass for `ParsedAddress`
- Zero runtime dependencies

### CI (`.github/workflows`)
- Node: matrix 18/20/22 → lint, typecheck, test
- Python: matrix 3.10/3.11/3.12 → ruff, pytest
- Both fail if fixture pass rate < 100%
- Publish jobs on tag `v*` (npm via `NPM_TOKEN`, PyPI via trusted publishing) — set up but don't run until the READMEs are done

## README requirements

Each package README must open with a **before/after table** of 8 messy inputs → canonical output, then install, 3-line usage, the `ParsedAddress` shape, a "what this library does NOT do" section (geocoding, validation against real addresses, city lookup — pointing to the API when it exists), and MIT license. Root README is brand-level: one paragraph on what geographicol is, links to both packages, tagline: *"Geographical data for Colombia, built for developers."*

No author name anywhere. Author field in `package.json` / `pyproject.toml` is `geographicol`. Git commits use the brand identity.

## Definition of done for Milestone 1

- [ ] `docs/nomenclature.md` written and reviewed
- [ ] `fixtures/addresses.json` with ≥60 groups
- [ ] Node lib passes 100% of fixtures, published to npm
- [ ] Python lib passes 100% of fixtures, published to PyPI
- [ ] Both READMEs with before/after tables
- [ ] CI green on all matrix versions
- [ ] GitHub org `geographicol` public with the repo

## Milestone 2 (next brief): minimal paid API

One endpoint, `POST /v1/normalize`, wrapping the same parser, deployed serverless on AWS, listed on RapidAPI with a free tier (1,000/mo) and a paid tier. Plus a static landing page at geographicol.com with the before/after table, pricing (Free / $49 / $149 / $399), a $29 founding-member checkout via Lemon Squeezy, and a one-question "what's your use case?" form. Geocoding, batch CSV and verification come **after** validation signals, not before. Do not start Milestone 2 until Milestone 1 is published.

## Working conventions

- Small commits, conventional commit messages
- When a real-world input breaks the parser: add it to fixtures first, then fix both libraries
- Prefer boring, readable regex/tokenizer code over clever parsing — this code will be read by contributors
- When unsure about a nomenclature rule, write it down as an open question in `docs/nomenclature.md` rather than guessing in code
- Any decision that changes the public API or canonical format must update this file
