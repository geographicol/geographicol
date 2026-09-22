# Colombian address nomenclature — rules for geographicol

This is the human-readable specification the parsers implement. When code and this file disagree, this file wins; when this file and the fixtures disagree, fix whichever is wrong and update both libraries.

Rules marked **Decision** are choices we made where sources disagree or are silent. Rules marked **Open question** are unresolved; the parser implements the stated default until the question is closed.

## 1. Sources

There is no single national address standard with the force of law. Two official abbreviation tables are in wide use, and they disagree in places:

| Source | What it is | Notes |
|---|---|---|
| **IGAC — Nomenclatura catastral** | The cadastral abbreviation table, reproduced by UIAF in *Diligenciamiento del campo de dirección* ([PDF](https://www.uiaf.gov.co/sites/default/files/2025-02/Nomenclatura%20Catastral.pdf)) | Uses `KR` for Carrera. Includes the element order and a worked example. Municipality and department names must follow DANE's DIVIPOLA. |
| **DIAN — Nomenclatura** | The table used for the RUT and tax forms ([PDF](https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2012/Nomenclatura_2012.pdf)) | Uses `CR` for Carrera. Used by accounting and ERP software. |

We could not find an address-abbreviation standard published by DANE itself. DANE's role is DIVIPOLA (the official list of departments and municipalities), which only matters to the API, not to the lite libraries.

**Decision:** we implement both, not one. Both tables describe the same address elements and differ only in the codes they write, so there is one set of parsing rules and one code table per standard (section 9). The output style is chosen with `options.style`: `igac` (the default), `dian` or `readable`. Every code from either table is accepted as input, whatever the style.

**Decision:** IGAC is the default because it is the cadastral authority, its `KR` code is the one most used across the ecosystem, and it comes with an element-order specification.

**Decision (public API change):** the brief named the default style `dane`. DANE has no address standard, so the style is renamed `igac` before anything is published.

## 2. Anatomy of an address

The IGAC element order, with its own example:

```
Calle   38   A Bis   Sur   3   A   18   Este
  1      2     3      4    5   6    7    8
```

| # | Element | ParsedAddress field |
|---|---|---|
| 1 | Street type of the *vía principal* | `streetType` |
| 2 | Number of the vía principal | `streetNumber` |
| 3 | Letter(s) and `BIS` suffix of the vía principal | `streetLetter` |
| 4 | Quadrant of the vía principal | `streetQuadrant` |
| 5 | Number of the cross street (*vía generadora*) | `crossNumber` |
| 6 | Letter(s) and `BIS` suffix of the cross street | `crossLetter` |
| 7 | Plate: distance in meters from the corner | `plateNumber` |
| 8 | Quadrant of the cross street, and then complements | `crossQuadrant`, `complements` |

IGAC writes this example as `CL 38A Bis Sur 3A 18 Este`. It explicitly forbids the word *número* and its substitutes (`Nro`, `N`, `No.`, `#`) and hyphens between elements. Those are exactly the things people type, so the parser accepts all of them and removes them from the canonical form.

In Bogotá the absence of `SUR` implies north, so `NORTE` is not written there.

## 3. Street types

Matching is case-insensitive, ignores accents and a trailing period, and is attempted longest-first, so `avenida carrera` wins over `avenida`.

| Canonical | Name | Accepted inputs |
|---|---|---|
| `CL` | Calle | calle, cll, cl, cle, c |
| `KR` | Carrera | carrera, cra, cr, kr, kra, k |
| `AV` | Avenida | avenida, av, avda |
| `AK` | Avenida Carrera | avenida carrera, av carrera, av cra, av kr, ak |
| `AC` | Avenida Calle | avenida calle, av calle, av cl, ac |
| `DG` | Diagonal | diagonal, diag, dg |
| `TV` | Transversal | transversal, transv, trans, tv, tr |
| `CIR` | Circular | circular, circ, cir, cq |
| `CCV` | Circunvalar | circunvalar, cvlar, ccv, crv, cv |
| `AUTOP` | Autopista | autopista, autop, auto, aut |
| `VIA` | Vía | via |
| `KM` | Kilómetro | kilometro, km — rural: parse, flag `RURAL_ADDRESS` |

**Decision:** `CIR` replaces the brief's `CQ`, `CCV` replaces `CV`, and `AUTOP` replaces `AUT`, because those are the IGAC codes. The brief's codes stay accepted as input.

**Decision:** single-letter aliases `c` and `k` are accepted, and flagged `AMBIGUOUS_STREET_TYPE`, because a lone letter at the start of a string is not always a street type.

**Open question:** named streets such as `Avenida Boyacá` or `Autopista Norte` are common in Bogotá. Their vía has a name instead of a number. **Default:** `streetType` is set, `streetNumber` is `null`, the name is not captured, and the warnings `NAMED_STREET` and `MISSING_STREET_NUMBER` apply (section 11).

## 4. Numbers, letters, BIS

- **Numbers** are 1 to 3 digits (`Calle 200`). **Decision:** numbers are not zero-padded. Neither IGAC nor DIAN pads.
- **Letters:** a single letter A–Z directly after a number, attached or separated by a space or hyphen: `45A`, `45 A`, `45-A` → letter `A`.
- **BIS** may stand alone or combine with letters: `45 BIS`, `45BIS`, `45 BIS A`, `45 B BIS`.
- **Field value:** `streetLetter` and `crossLetter` hold the whole suffix in order of appearance, uppercase and single-spaced: `"A"`, `"BIS"`, `"BIS A"`, `"B BIS"`, `"A BIS B"`.
- **Canonical rendering:** a letter directly after the number is attached; everything after it is space-separated: `38` + `A BIS` → `38A BIS`, `45` + `BIS A` → `45 BIS A`, `45` + `B BIS` → `45B BIS`.

**Decision:** `BIS` is written in uppercase, following the brief's "uppercase everything" rule. IGAC and OpenStreetMap write `Bis`; the readable style uses `Bis`.

## 5. Quadrants

| Canonical | Accepted inputs | Warning |
|---|---|---|
| `SUR` | sur, s | — |
| `ESTE` | este, e | — |
| `NORTE` | norte | `UNCOMMON_QUADRANT` |
| `OESTE` | oeste, occidente, occ | `UNCOMMON_QUADRANT` |

- A quadrant belongs to the nearest preceding number: `CL 78 SUR 20D 15` puts `SUR` on the street; `CL 38A 3A 18 ESTE` puts `ESTE` on the cross street.
- **Decision:** quadrants are written in full in the canonical form (`SUR`, not `S`), because that is how both IGAC and DIAN write them.
- **Decision:** `NORTE` and `OESTE` have no single-letter form, because a bare `N` means *número* (section 6) and `O` is too easily a typo.
- **Decision:** a single letter `S` or `E` is read as a quadrant only when it stands alone, separated by spaces: `78 S 20`. When it is attached to a number (`78S`), it is a street letter. The single-letter form is also flagged `AMBIGUOUS_QUADRANT`, since OpenStreetMap's Colombia guide warns that `e` and `s` get confused with street letters.
- **Decision (public API change):** the brief types quadrants as `"SUR" | "ESTE"`. Both official tables list `NORTE` and `OESTE`, and Cali uses them routinely, so the type becomes `"SUR" | "ESTE" | "NORTE" | "OESTE"`.

**Open question:** `NORTE` and `OESTE` are normal in Cali, so `UNCOMMON_QUADRANT` may be the wrong signal there. Since the lite library never knows the city, the flag stays for now.

## 6. The `#` and the plate

- **Number markers**, all removed: `#`, `N`, `No`, `No.`, `Nº`, `N°`, `Nro`, `Nro.`, `num`, `numero`, `número`, or nothing (`KR 45 12 30`).
- **A bare `N` is a number marker** (`KR 45 N 12-30`), as DIAN lists it. It is never read as `NORTE`.
- **Plate separators:** `-`, `–` (en dash), `—` (em dash), a space, or none.
- **Plate numbers** are 1 to 3 digits.
- **Glued cross and plate** such as `1230`: **Decision:** when a 3- or 4-digit block appears where cross + plate are expected, the last two digits are the plate (`1230` → cross `12`, plate `30`; `530` → cross `5`, plate `30`). Flag `AMBIGUOUS_PLATE`. A block of 5 or more digits is not split; it becomes an unknown token.

## 7. Complements

A complement is a keyword followed by a value. The value runs until the next complement keyword, a comma, or the end of the address. It is uppercased and single-spaced. Multiple complements keep their order: `Torre 2 Apto 501` → `TO 2 APTO 501`.

Each complement is returned as `{ type, code, value }`:
- `type` is the `ComplementType`.
- `code` is the IGAC code, independent of the output style (section 9).
- `value` is the value only, without the keyword.

`Torre 2 Apto 501` → `[{ type: "TORRE", code: "TO", value: "2" }, { type: "APARTAMENTO", code: "APTO", value: "501" }]`.

| Type | IGAC code | DIAN code | Accepted inputs |
|---|---|---|---|
| APARTAMENTO | `APTO` | `AP` | apartamento, aparta, apto, apt, ap |
| TORRE | `TO` | `TO` | torre, to, tr * |
| LOCAL | `LC` | `LC` | local, loc, lc, lo |
| OFICINA | `OF` | `OF` | oficina, ofi, ofc, of |
| PISO | `PI` | `P` | piso, pi, p * |
| INTERIOR | `IN` | `IN` | interior, int, in |
| BLOQUE | `BL` | `BL` | bloque, blq, bl |
| MANZANA | `MZ` | `MZ` | manzana, mza, mz |
| CASA | `CA` | `CA` | casa, ca |
| ETAPA | `ET` | `ET` | etapa, et |
| CONJUNTO | `CONJ` | `CONJ` | conjunto, conj, cj |
| EDIFICIO | `ED` | `ED` | edificio, edif, ed |
| BODEGA | `BG` | `BG` | bodega, bod, bg |
| LOTE | `LT` | `LT` | lote, lt |
| BARRIO | `BR` | `BRR` | barrio, brr, br, bo, b/ |
| OTRO | *section 9* | *section 9* | any other code from the IGAC or DIAN tables |

\* Context-dependent aliases:
- `tr` is TORRE only after the vía principal and the placa have been parsed. At the start of an address it is Transversal.
- `p` is PISO only when followed by a number.

**Decision:** `cs` is not accepted as CASA, contrary to the brief. Both IGAC and DIAN define `CS` as *Consultorio*, so it maps to OTRO.

**OTRO:** other recognized codes, listed in section 9, become `{ type: "OTRO", code: "<IGAC code>", value }`, for example `PH 2` → `{ type: "OTRO", code: "PH", value: "2" }`. **Open question:** whether a later version should give the common ones their own `ComplementType`.

## 8. Locality and department

- **With commas:** after the address, a comma-separated segment that does not start with a complement keyword is the `locality`. A second segment is the `department`. `KR 43A 1 50, Medellín, Antioquia` → locality `Medellín`, department `Antioquia`.
- **Without commas:** a trailing run of words with no digits, after the plate and complements, is the locality: `KR 45 12 30 Medellín`.
- Locality and department keep their original spelling, trimmed. They are never checked against a city list in the lite library, and their presence always adds the warning `LOCALITY_UNVERIFIED`.

## 9. Code tables

Parsing is the same for every standard. The standards differ only in the codes they write, so each output style is a code table. The parser accepts every code in every column as input.

Each library keeps these tables in one module, so a correction is a one-line change. The fixtures check both libraries against the same expected strings, which catches any drift between them.

### Street types

| Meaning | `igac` | `dian` | `readable` |
|---|---|---|---|
| Calle | `CL` | `CL` | Calle |
| Carrera | `KR` | `CR` | Carrera |
| Avenida | `AV` | `AV` | Avenida |
| Avenida Carrera | `AK` | `AK` | Avenida Carrera |
| Avenida Calle | `AC` | `AC` | Avenida Calle |
| Diagonal | `DG` | `DG` | Diagonal |
| Transversal | `TV` | `TV` | Transversal |
| Circular | `CIR` | `CIR` | Circular |
| Circunvalar | `CCV` | `CRV` | Circunvalar |
| Autopista | `AUTOP` | `AUT` | Autopista |
| Vía | `VIA` | `VIA` † | Vía |
| Kilómetro | `KM` | `KM` | Kilómetro |

† DIAN's table has no code for *Vía*, so the `dian` style writes `VIA`.

### Quadrants

Written in full in every style: `SUR`, `ESTE`, `NORTE`, `OESTE` in `igac` and `dian`; `Sur`, `Este`, `Norte`, `Oeste` in `readable`.

### Complements

The 15 named complement types are in section 7. The OTRO codes:

| Meaning | `igac` | `dian` |
|---|---|---|
| Penthouse | `PH` | `PH` |
| Garaje | `GJ` | `GJ` |
| Semisótano | `SS` | `SS` |
| Consultorio | `CS` | `CS` |
| Unidad | `UN` | `UN` |
| Urbanización | `URB` | `URB` |
| Sector | `SEC` | `SEC` |
| Local mezzanine | `LM` | `LM` |
| Mezzanine | `MN` | `MN` |
| Terraza | `TZ` | `TZ` |
| Centro comercial | `CECO` | `CC` |
| Suite | `SU` | `SUITE` |
| Agrupación | `AGN` | `AGP` |
| Vereda | `VDA` | `VRD` |
| Supermanzana | `SMZ` | `SM` |
| Pasaje | `PSJ` | `PJ` |
| Portería | `PT` | `POR` |

In the `readable` style, OTRO complements use the meaning column: `Penthouse 2`.

## 10. Output styles

`options.style` picks the code table for `canonical` and `normalize()`. The default is `igac`.

### `igac` (default) and `dian`

Uppercase, the style's codes, no `#`, no hyphens, no padding, single spaces, quadrants in full:

```
street-type  number[letter][ suffix]  [quadrant]  cross[letter][ suffix]  plate  [quadrant]  [complement-code value]...
```

| Input | `igac` | `dian` |
|---|---|---|
| `Carrera 45 # 12-30 Local 3` | `KR 45 12 30 LC 3` | `CR 45 12 30 LC 3` |
| `Calle 78 Sur # 20D – 15` | `CL 78 SUR 20D 15` | `CL 78 SUR 20D 15` |
| `Avenida Carrera 73B Sur # 4 – 10 Torre 2` | `AK 73B SUR 4 10 TO 2` | `AK 73B SUR 4 10 TO 2` |
| `Calle 38 A Bis Sur # 3A-18 Este` | `CL 38A BIS SUR 3A 18 ESTE` | `CL 38A BIS SUR 3A 18 ESTE` |
| `Cra 7 # 45 - 12 Torre 2 Apto 501` | `KR 7 45 12 TO 2 APTO 501` | `CR 7 45 12 TO 2 AP 501` |

Locality and department are **not** part of either string.

### `readable`

Full street-type names, with `#` and a hyphen before the plate, `Bis` and quadrants in title case, and complements after commas as full words:

```
Carrera 45 # 12-30, Local 3
Avenida Carrera 73B Sur # 4-10, Torre 2
Calle 38A Bis Sur # 3A-18 Este
Carrera 7 # 45-12, Torre 2, Apartamento 501
```

### Fields

- `canonical` follows `options.style`.
- `normalized` is always the `readable` form, whatever the style option.

## 11. Warnings and confidence

Confidence starts at 1.0. Each warning subtracts its penalty, and the result is clamped to [0, 1]. A penalty applies once per occurrence (two unknown tokens subtract 0.3), except where marked *once*.

| Warning code | When | Penalty | Origin |
|---|---|---|---|
| `UNRECOGNIZED_STREET_TYPE` | No street type found | −0.5 | brief |
| `MISSING_CROSS_NUMBER` | No cross-street number | −0.4 | brief |
| `AMBIGUOUS_PLATE` | Cross and plate were split from one block (`1230`) | −0.2 | brief |
| `UNKNOWN_TOKEN` | A token matches no rule | −0.15 | brief |
| `RURAL_ADDRESS` | Street type `KM` | −0.1 | brief |
| `MISSING_PLATE_NUMBER` | Cross number present, plate absent | −0.2 | added |
| `MISSING_STREET_NUMBER` | Street type present, number absent | −0.4 | added |
| `NAMED_STREET` | The vía principal is a name (section 3) | 0 | added |
| `AMBIGUOUS_STREET_TYPE` | Single-letter alias `c` or `k` | −0.1 *once* | added |
| `AMBIGUOUS_QUADRANT` | Single-letter quadrant `S` or `E` | −0.05 | added |
| `UNCOMMON_QUADRANT` | `NORTE` or `OESTE` | 0 | brief |
| `LOCALITY_UNVERIFIED` | Locality or department captured | 0 *once* | brief |
| `EMPTY_INPUT` | Input is empty or only whitespace | confidence 0 | added |

`strict: true` doubles every penalty.

`isValid(input)` is `true` when confidence ≥ 0.7 and both `streetNumber` and `crossNumber` are present.

## 12. Parsing procedure

The procedure both implementations follow, in order. Keep it boring: a tokenizer and a left-to-right pass, no backtracking beyond what is written here.

1. **Keep `raw`.** Store the input untouched.
2. **Normalize text for matching.** Lowercase; strip accents (`á` → `a`, keeping `ñ`); turn `º` and `°` into `o`. Keep the original text alongside so locality keeps its spelling.
3. **Split off comma segments.** The first segment is the address. Later segments are complements if they start with a complement keyword, otherwise locality, then department (section 8).
4. **Tokenize.** Split on spaces, `#`, hyphens and dashes. Split letter-digit boundaries so that `45A` → `45`, `A` (remembering it was attached) and `KR45` → `KR`, `45`. Remove trailing periods. Drop number markers (section 6).
5. **Street type.** Match the longest alias at the start (section 3).
6. **Vía principal.** Number, then letter and `BIS` suffix, then quadrant.
7. **Placa.** Cross number, then its suffix, then plate number, then quadrant. Apply the glued-block rule (section 6).
8. **Complements.** Keyword, then value, repeated.
9. **Leftovers.** A trailing run of words with no digits is the locality. Anything else is `UNKNOWN_TOKEN`.
10. **Score and render.** Apply section 11, then build `canonical` and `normalized` (section 10).

`parse` never throws. Unparseable input returns `confidence: 0`, all fields `null` or empty, and the warnings that apply.

## 13. City notes

These notes describe nomenclature habits per city. They are working knowledge, not verified sources, so each one needs real addresses in the fixtures before we rely on it.

- **Bogotá:** `SUR` and `ESTE` are frequent. `NORTE` is not written. Numbered avenues use `AK` and `AC` (`AK 68`, `AC 26`). Named avenues (`Avenida Boyacá`, `Autopista Norte`) are common, see section 3.
- **Medellín:** `Circular` and `Transversal` are common in Laureles. Cross letters are frequent (`# 43D-45`).
- **Cali:** `NORTE` and `OESTE` are used routinely. In the north, `AV 6N` means *Avenida 6 Norte*, but by section 4 the attached `N` reads as a street letter (open question 7).
- **Barranquilla:** plain `CL`/`KR` grid. Plates can have 3 digits.
- **Cartagena:** in the historic centre, many streets have names only (`Calle de la Factoría`). Outside it, the numeric grid applies.
- **Bucaramanga:** plain `CL`/`KR` grid, with `NORTE` in some sectors.

## 14. Open questions

1. Named streets: is `NAMED_STREET` with a null number the right model, or should the lite library capture the name in a field? (section 3)
2. Should `UNCOMMON_QUADRANT` be dropped, given that Cali uses `NORTE`/`OESTE` routinely? (section 5)
3. Should common OTRO codes (`PH`, `GJ`, `SS`, `CS`) get their own `ComplementType` values? (section 7)
4. Can plates legitimately exceed 3 digits in any city? (section 6)
5. Is there an official DANE or ICONTEC address standard we missed? If one appears, it becomes another code table, and possibly the default. (section 1)
6. The city notes in section 13 need real-address confirmation.
7. Cali writes `AV 6N` for *Avenida 6 Norte*. Without knowing the city, the lite library reads `N` as a letter. Is that acceptable, or should an attached `N` after an `AV` number become a quadrant?
