# Colombian address nomenclature — rules for geographicol

This is the human-readable specification the parsers implement. When code and this file disagree, this file wins; when this file and the fixtures disagree, fix whichever is wrong and update both libraries.

Rules marked **Decision** are choices we made where sources disagree or are silent. Rules marked **Open question** are unresolved; the parser implements the stated default until the question is closed. Closed questions are listed in section 15.

## 1. Sources

There is no single national address standard with the force of law, and no ICONTEC technical standard (NTC) for addresses that we could find. Three official conventions are in use, and they disagree in places:

| Source | What it is | Notes |
|---|---|---|
| **Nomenclatura catastral** | The older cadastral abbreviation table, reproduced by UIAF in *Diligenciamiento del campo de dirección* (February 2025, [PDF](https://www.uiaf.gov.co/sites/default/files/2025-02/Nomenclatura%20Catastral.pdf)) | Abbreviates street types (`KR`, `CL`). Includes the element order and a worked example. Municipality and department names must follow DANE's DIVIPOLA. |
| **IGAC — Instructivo de Identificación Predial** | IGAC's current cadastral manual, code IN-GCT-PC01-06, version 1, in force since 19 June 2024 ([PDF](https://www.igac.gov.co/sites/default/files/listadomaestro/IN-GCT-PC01-06%20Identificacion%20Predial_0.pdf)), section 4.2.3 | Writes street types as **full words**, never abbreviated (`Carrera 6B 7A 26`). Abbreviates only complements, with its own table (Tabla 21), which differs from the older one. |
| **DIAN — Nomenclatura** | The table used for the RUT and tax forms ([PDF](https://www.dian.gov.co/atencionciudadano/formulariosinstructivos/Formularios/2012/Nomenclatura_2012.pdf)) | Uses `CR` for Carrera. Used by accounting and ERP software. |

We could not find an address-abbreviation standard published by DANE itself. DANE's role is DIVIPOLA (the official list of departments and municipalities), which only matters to the API, not to the lite libraries.

**Decision:** we implement all three as output styles, not one. They describe the same address elements and differ only in how they write them, so there is one set of parsing rules and one code table per convention (section 9). The style is chosen with `options.style`: `catastral` (the default), `igac`, `dian` or `readable`. Every code from every table is accepted as input, whatever the style.

**Decision:** `catastral` is the default because its compact codes (`KR 7 45 12`) make a good canonical key, it is the table most used across the ecosystem, and UIAF still published it in 2025.

**Decision (public API change, 0.2.0):** 0.1.0 called the default style `igac`. IGAC's 2024 manual turned out to differ from that table, so the style is renamed `catastral` (its real source name), and `igac` now follows the 2024 manual exactly. The brief originally named the default `dane`; DANE has no address standard.

## 2. Anatomy of an address

The cadastral element order, with its own example:

```
Calle   38   A Bis   Sur   3   A   18   Este
  1      2     3      4    5   6    7    8
```

| # | Element | ParsedAddress field |
|---|---|---|
| 1 | Street type of the *vía principal* | `streetType` |
| 2 | Number (or name, section 3) of the vía principal | `streetNumber`, `streetName` |
| 3 | Letter(s) and `BIS` suffix of the vía principal | `streetLetter` |
| 4 | Quadrant of the vía principal | `streetQuadrant` |
| 5 | Number of the cross street (*vía generadora*) | `crossNumber` |
| 6 | Letter(s) and `BIS` suffix of the cross street | `crossLetter` |
| 7 | Plate: distance in meters from the corner | `plateNumber` |
| 8 | Quadrant of the cross street, and then complements | `crossQuadrant`, `complements` |

The source writes this example as `CL 38A Bis Sur 3A 18 Este`. It explicitly forbids the word *número* and its substitutes (`Nro`, `N`, `No.`, `#`) and hyphens between elements. Those are exactly the things people type, so the parser accepts all of them and removes them from the canonical form.

In Bogotá the absence of `SUR` implies north, so `NORTE` is not written there.

## 3. Street types

Matching is case-insensitive, ignores accents and a trailing period, and is attempted longest-first, so `avenida carrera` wins over `avenida`.

| Code | Name | Accepted inputs |
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

`streetType` always holds the code from this table, whatever the output style.

**Decision:** `CIR` replaces the brief's `CQ`, `CCV` replaces `CV`, and `AUTOP` replaces `AUT`, because those are the cadastral codes. The brief's codes stay accepted as input.

**Decision:** single-letter aliases `c` and `k` are accepted, and flagged `AMBIGUOUS_STREET_TYPE`, because a lone letter at the start of a string is not always a street type.

### Named streets

**Decision:** when words, not a number, follow the street type (`Avenida Boyacá`, `Autopista Norte`, `Calle de la Factoría`), they are the street's name. The name runs until the first number or number marker, even through words that are otherwise quadrants (`Autopista Norte`).

- It is stored in `streetName`, uppercased and single-spaced with accents kept: `"BOYACÁ"`, `"DE LA FACTORÍA"`. `streetNumber` is `null`.
- It takes the place of the number in every output (section 10): `AV BOYACÁ 12 30`.
- The warning `NAMED_STREET` is raised, with no penalty. `MISSING_STREET_NUMBER` is **not** raised.
- `isValid()` accepts a name in place of the street number.

### KM addresses

**Decision:** `KM` addresses are road locations, not grid addresses. The text after the kilometre number (`Km 5 Vía Cali Jamundí`) is the road description and is captured as `locality`.

## 4. Numbers, letters, BIS

- **Numbers** are 1 to 3 digits (`Calle 200`). **Decision:** numbers are not zero-padded. No source pads the street or cross number.
- **Letters:** a single letter A–Z directly after a number, attached or separated by a space or hyphen: `45A`, `45 A`, `45-A` → letter `A`. Exceptions: see section 5 for `S`, `E` and `N`.
- **BIS** may stand alone or combine with letters: `45 BIS`, `45BIS`, `45 BIS A`, `45 B BIS`.
- **Field value:** `streetLetter` and `crossLetter` hold the whole suffix in order of appearance, uppercase and single-spaced: `"A"`, `"BIS"`, `"BIS A"`, `"B BIS"`, `"A BIS B"`.
- **Rendering:** a letter directly after the number is attached; everything after it is space-separated: `38` + `A BIS` → `38A BIS`, `45` + `BIS A` → `45 BIS A`, `45` + `B BIS` → `45B BIS`.

**Decision:** `BIS` is written in uppercase in the code styles, following the brief's "uppercase everything" rule. The `readable` style writes `Bis`.

## 5. Quadrants

| Value | Accepted inputs | Warning |
|---|---|---|
| `SUR` | sur, s | — |
| `ESTE` | este, e | — |
| `NORTE` | norte, n (attached only) | `UNCOMMON_QUADRANT` |
| `OESTE` | oeste, occidente, occ | `UNCOMMON_QUADRANT` |

- **Position:** a quadrant belongs to the nearest preceding number: `CL 78 SUR 20D 15` puts `SUR` on the street; `CL 38A 3A 18 ESTE` puts `ESTE` on the cross street. The exception is a quadrant written after the plate (below).
- **Decision:** quadrants are written in full in every style (`SUR`, not `S`).
- **Decision:** a single letter `S` or `E` is a quadrant only when it stands alone: `78 S 20`. Attached to a number (`78S`), it is a street letter. The standalone form is flagged `AMBIGUOUS_QUADRANT`, since OpenStreetMap's Colombia guide warns that `e` and `s` get confused with street letters.
- **Decision:** a single `N` works the other way round. Standing alone it is a number marker (section 6). Attached to a number, it is `NORTE`, flagged `AMBIGUOUS_QUADRANT`. That is how northern Cali writes addresses: `Av 6N # 23N-45` is *Avenida 6 Norte # 23 Norte - 45*. Street letters rarely go past H or I, so an attached `N` is far more likely to mean Norte.
- **Decision:** `OESTE` has no single-letter form, because `O` is too easily a typo.
- **Decision:** `UNCOMMON_QUADRANT` stays as an information-only warning (no penalty) on `NORTE` and `OESTE`, for anyone who wants to spot non-Bogotá conventions.
- **Decision (public API change):** the brief types quadrants as `"SUR" | "ESTE"`. The official tables list `NORTE` and `OESTE`, and Cali uses them routinely, so the type is `"SUR" | "ESTE" | "NORTE" | "OESTE"`.

### A quadrant after the plate

In Bogotá, `Calle 48 # 5-20 Sur` means *Calle 48 Sur # 5-20*. `SUR` describes calles (numbered south of the reference line), and `ESTE` describes carreras. So a quadrant written after the plate follows the kind of street it describes.

**Decision:** when a quadrant appears after the plate, and the street has no quadrant yet:
- a `SUR` goes to the street if the street is calle-like (`CL`, `AC`, `DG`);
- an `ESTE` goes to the street if the street is carrera-like (`KR`, `AK`, `TV`);
- otherwise it stays on the cross street.

| Input | Result | Why |
|---|---|---|
| `Calle 48 # 5-20 Sur` | `CL 48 SUR 5 20` | A Calle's SUR |
| `Carrera 10 # 20-30 Sur` | `KR 10 20 30 SUR` | The cross street is *Calle 20 Sur* |
| `Carrera 1 # 18-30 Este` | `KR 1 ESTE 18 30` | A Carrera's ESTE |
| `Calle 38A Bis Sur # 3A-18 Este` | `CL 38A BIS SUR 3A 18 ESTE` | The street already has a quadrant |

## 6. The `#` and the plate

- **Number markers**, all removed: `#`, `N`, `No`, `No.`, `Nº`, `N°`, `Nro`, `Nro.`, `num`, `numero`, `número`, or nothing (`KR 45 12 30`).
- **A bare `N` is a number marker** (`KR 45 N 12-30`), as DIAN lists it. Only an attached `N` is `NORTE` (section 5).
- **Plate separators:** `-`, `–` (en dash), `—` (em dash), a space, or none.
- **Plate numbers** are 1 to 3 digits. A longer block is an unknown token.
- **Glued cross and plate** such as `1230`: **Decision:** when a 3- or 4-digit block appears where the cross number is expected and no plate number follows it, the last two digits are the plate (`1230` → cross `12`, plate `30`; `530` → cross `5`, plate `30`). Flag `AMBIGUOUS_PLATE`. A block of 5 or more digits is not split; it becomes an unknown token.

## 7. Complements

A complement is a keyword followed by a value. For most types the value is **one token**, and tokens that were attached in the input are rejoined (`Apto 501B` → `501B`). For **name-valued** types (BARRIO, CONJUNTO, EDIFICIO, and the OTRO codes `CECO`, `URB`, `SEC`, `AGN`, `VDA`), the value runs until the next complement keyword, a comma, or the end of the address (`Edificio San Fernando Oficina 801` → `SAN FERNANDO`, then `801`). Values are uppercased and single-spaced, and keep their accents. A keyword with no value is an `UNKNOWN_TOKEN`. Multiple complements keep their order: `Torre 2 Apto 501` → `TO 2 APTO 501`.

Each complement is returned as `{ type, code, value }`:
- `type` is the `ComplementType`.
- `code` is the `catastral` code, whatever the output style (section 9).
- `value` is the value only, without the keyword.

`Torre 2 Apto 501` → `[{ type: "TORRE", code: "TO", value: "2" }, { type: "APARTAMENTO", code: "APTO", value: "501" }]`.

| Type | `catastral` | `igac` | `dian` | Accepted inputs |
|---|---|---|---|---|
| APARTAMENTO | `APTO` | `AP` | `AP` | apartamento, aparta, apto, apt, ap |
| TORRE | `TO` | `TO` | `TO` | torre, to, tr * |
| LOCAL | `LC` | `L` | `LC` | local, loc, lc, lo †, l * |
| OFICINA | `OF` | `OF` | `OF` | oficina, ofi, ofc, of |
| PISO | `PI` | `P` | `P` | piso, pi, p * |
| INTERIOR | `IN` | `IN` | `IN` | interior, int, in |
| BLOQUE | `BL` | `BQ` | `BL` | bloque, blq, bq, bl |
| MANZANA | `MZ` | `MZ` | `MZ` | manzana, mza, mz |
| CASA | `CA` | `CS` | `CA` | casa, ca |
| ETAPA | `ET` | `ET` | `ET` | etapa, et |
| CONJUNTO | `CONJ` | `CO` | `CONJ` | conjunto, conj, cj, co |
| EDIFICIO | `ED` | `ED` | `ED` | edificio, edif, ed |
| BODEGA | `BG` | `BD` | `BG` | bodega, bod, bd, bg |
| LOTE | `LT` | `LO` | `LT` | lote, lt |
| BARRIO | `BR` | `BR` | `BRR` | barrio, brr, br, bo |
| OTRO | *section 9* | *section 9* | *section 9* | any other code from the three tables |

\* Context-dependent aliases:
- `tr` is TORRE only after the vía principal and the placa have been parsed. At the start of an address it is Transversal.
- `p` is PISO and `l` is LOCAL only when followed by a number.

† Conflicting codes between the tables, read the way two of the three sources read them, and flagged `AMBIGUOUS_COMPLEMENT`:
- **`CS`** is *Consultorio* in the catastral and DIAN tables, but *Casa* in IGAC 2024. Read as Consultorio (OTRO).
- **`LO`** is *Local* in the catastral table, but *Lote* in IGAC 2024. Read as Local.

**OTRO:** other recognized codes, listed in section 9, are accepted as their code or their full name (`PH` or `Penthouse`, `CC` or `Centro Comercial`). They become `{ type: "OTRO", code: "<catastral code>", value }`, for example `PH 2` → `{ type: "OTRO", code: "PH", value: "2" }`.

**Decision:** the OTRO codes keep type `OTRO` for now; the `code` field tells them apart. Revisit when real data shows which ones are frequent.

## 8. Locality and department

- **With commas:** after the address, a comma-separated segment that does not start with a complement keyword is the `locality`. A second segment is the `department`. `KR 43A 1 50, Medellín, Antioquia` → locality `Medellín`, department `Antioquia`.
- **Without commas:** a trailing run of words with no digits, after the plate and complements, is the locality: `KR 45 12 30 Medellín`.
- Locality and department keep their original spelling, trimmed. They are never checked against a city list in the lite library, and their presence always adds the warning `LOCALITY_UNVERIFIED`.

## 9. Code tables

Parsing is the same for every convention. They differ only in how they write the address, so each output style is a code table. The parser accepts every code in every column as input.

Each library keeps these tables in one module, so a correction is a one-line change. The fixtures check both libraries against the same expected strings, which catches any drift between them.

### Street types

| Meaning | `catastral` | `igac` | `dian` | `readable` |
|---|---|---|---|---|
| Calle | `CL` | Calle | `CL` | Calle |
| Carrera | `KR` | Carrera | `CR` | Carrera |
| Avenida | `AV` | Avenida | `AV` | Avenida |
| Avenida Carrera | `AK` | Avenida Carrera | `AK` | Avenida Carrera |
| Avenida Calle | `AC` | Avenida Calle | `AC` | Avenida Calle |
| Diagonal | `DG` | Diagonal | `DG` | Diagonal |
| Transversal | `TV` | Transversal | `TV` | Transversal |
| Circular | `CIR` | Circular | `CIR` | Circular |
| Circunvalar | `CCV` | Circunvalar | `CRV` | Circunvalar |
| Autopista | `AUTOP` | Autopista | `AUT` | Autopista |
| Vía | `VIA` | Vía ‡ | `VIA` † | Vía |
| Kilómetro | `KM` | `KM` ‡ | `KM` | Kilómetro |

† DIAN's table has no code for *Vía*, so the `dian` style writes `VIA`.
‡ IGAC 2024's list of street types has no *Vía* or *Kilómetro*. `igac` writes `Vía` as a full word like the other street types, and `KM` as in its complement table.

### Quadrants

Written in full in every style: `SUR`, `ESTE`, `NORTE`, `OESTE` in `catastral` and `dian`; `Sur`, `Este`, `Norte`, `Oeste` in `igac` and `readable`.

**Decision:** IGAC 2024 lists the city sector as the full words *Norte, Sur, Este, Oeste*, so `igac` writes them in full. Its complement table also has `N`, `S`, `W`, which we accept as input only where section 5 allows.

### Complements

The 15 named complement types are in section 7. The OTRO codes:

| Meaning | `catastral` | `igac` | `dian` |
|---|---|---|---|
| Penthouse | `PH` | `PN` | `PH` |
| Garaje | `GJ` | `GA` | `GJ` |
| Semisótano | `SS` | `SS` | `SS` |
| Consultorio | `CS` † | `CON` | `CS` |
| Unidad | `UN` | `UN` | `UN` |
| Urbanización | `URB` | `UR` | `URB` |
| Sector | `SEC` | `SC` | `SEC` |
| Local mezzanine | `LM` | `LM` ‡ | `LM` |
| Mezzanine | `MN` | `MN` | `MN` |
| Terraza | `TZ` | `TZ` ‡ | `TZ` |
| Centro comercial | `CECO` | `CECO` ‡ | `CC` |
| Suite | `SU` | `SU` ‡ | `SUITE` |
| Agrupación | `AGN` | `AGN` ‡ | `AGP` |
| Vereda | `VDA` | `VDA` | `VRD` |
| Supermanzana | `SMZ` | `SMZ` ‡ | `SM` |
| Pasaje | `PSJ` | `PJ` | `PJ` |
| Portería | `PT` | `PR` | `POR` |

All codes in every column, plus `pn`, `ga`, `con`, `ur`, `sc` and `pr`, are accepted as input.
† See section 7: input `CS` is read as Consultorio and flagged.
‡ Not in IGAC 2024's table; `igac` falls back to the `catastral` code.

In the `readable` style, OTRO complements use the meaning column: `Penthouse 2`.

## 10. Output styles

`options.style` picks the style for `canonical` and `normalize()`. The default is `catastral`.

### `catastral` (default) and `dian`

Uppercase, the style's codes, no `#`, no hyphens, no padding, single spaces, quadrants in full:

```
street-type  number[letter][ suffix] | name  [quadrant]  cross[letter][ suffix]  plate  [quadrant]  [complement-code value]...
```

### `igac`

Follows IGAC's 2024 manual: the street type as a full word, then the same structure, with quadrants and the street name in title case and IGAC 2024 complement codes. The manual's own examples: `Carrera 6B 7A 26 BR La primavera`, `Transversal 7 2 03 VDA el porvenir`.

| Input | `catastral` | `igac` | `dian` |
|---|---|---|---|
| `Carrera 45 # 12-30 Local 3` | `KR 45 12 30 LC 3` | `Carrera 45 12 30 L 3` | `CR 45 12 30 LC 3` |
| `Calle 78 Sur # 20D – 15` | `CL 78 SUR 20D 15` | `Calle 78 Sur 20D 15` | `CL 78 SUR 20D 15` |
| `Calle 38 A Bis Sur # 3A-18 Este` | `CL 38A BIS SUR 3A 18 ESTE` | `Calle 38A BIS Sur 3A 18 Este` | `CL 38A BIS SUR 3A 18 ESTE` |
| `Cra 7 # 45 - 12 Torre 2 Apto 501` | `KR 7 45 12 TO 2 APTO 501` | `Carrera 7 45 12 TO 2 AP 501` | `CR 7 45 12 TO 2 AP 501` |
| `Avenida Boyacá # 12-30` | `AV BOYACÁ 12 30` | `Avenida Boyacá 12 30` | `AV BOYACÁ 12 30` |

Locality and department are **not** part of any canonical string.

### `readable`

Full street-type names, with `#` and a hyphen before the plate, `Bis`, quadrants and street names in title case, and complements after commas as full words:

```
Carrera 45 # 12-30, Local 3
Avenida Carrera 73B Sur # 4-10, Torre 2
Calle 38A Bis Sur # 3A-18 Este
Carrera 7 # 45-12, Torre 2, Apartamento 501
Calle de la Factoría # 36-57
```

**Title case for street names:** each word is capitalized, except the Spanish small words *de, del, la, las, los, el, y*, which stay lowercase: `DE LA FACTORÍA` → `de la Factoría`.

### Fields

- `canonical` follows `options.style`.
- `normalized` is always the `readable` form, whatever the style option.

## 11. Warnings and confidence

Confidence starts at 1.0. Each warning subtracts its penalty, and the result is clamped to [0, 1]. A penalty applies once per occurrence (two unknown tokens subtract 0.3), except where marked *once*. The `warnings` list holds each code once, in the order first raised.

| Warning code | When | Penalty | Origin |
|---|---|---|---|
| `UNRECOGNIZED_STREET_TYPE` | No street type found | −0.5 | brief |
| `MISSING_CROSS_NUMBER` | No cross-street number | −0.4 | brief |
| `AMBIGUOUS_PLATE` | Cross and plate were split from one block (`1230`) | −0.2 | brief |
| `UNKNOWN_TOKEN` | A token matches no rule | −0.15 | brief |
| `RURAL_ADDRESS` | Street type `KM` | −0.1 | brief |
| `MISSING_PLATE_NUMBER` | Cross number present, plate absent | −0.2 | added |
| `MISSING_STREET_NUMBER` | No street number and no street name | −0.4 | added |
| `NAMED_STREET` | The vía principal is a name (section 3) | 0 | added |
| `AMBIGUOUS_STREET_TYPE` | Single-letter alias `c` or `k` | −0.1 *once* | added |
| `AMBIGUOUS_QUADRANT` | Standalone `S` or `E`, or attached `N` | −0.05 | added |
| `AMBIGUOUS_COMPLEMENT` | `CS` or `LO`, whose meaning differs between tables | −0.05 | added |
| `UNCOMMON_QUADRANT` | `NORTE` or `OESTE` | 0 | brief |
| `LOCALITY_UNVERIFIED` | Locality or department captured | 0 *once* | brief |
| `EMPTY_INPUT` | Input is empty or only whitespace | confidence 0 | added |

`strict: true` doubles every penalty.

`isValid(input)` is `true` when confidence ≥ 0.7, a `crossNumber` is present, and either a `streetNumber` or a `streetName` is present.

## 12. Parsing procedure

The procedure both implementations follow, in order. Keep it boring: a tokenizer and a left-to-right pass, no backtracking beyond what is written here.

1. **Keep `raw`.** Store the input untouched.
2. **Normalize text for matching.** Lowercase; strip accents (`á` → `a`, keeping `ñ`); turn `º` and `°` into `o`. Keep the original text alongside so names, values and locality keep their spelling.
3. **Split off comma segments.** The first segment is the address. Later segments are complements if they start with a complement keyword, otherwise locality, then department (section 8).
4. **Tokenize.** Split on spaces, `#`, hyphens and dashes. Split letter-digit boundaries so that `45A` → `45`, `A` (remembering it was attached) and `KR45` → `KR`, `45`. Remove trailing periods. Drop number markers (section 6).
5. **Street type.** Match the longest alias at the start (section 3). If none matches, raise `UNRECOGNIZED_STREET_TYPE` and continue from step 6 anyway: `45 # 12-30` still yields numbers.
6. **Vía principal.** A name (section 3), or a number, then letter and `BIS` suffix, then quadrant.
7. **Placa.** Cross number, then its suffix and quadrant, then plate number, then a trailing quadrant (section 5). Apply the glued-block rule (section 6).
8. **Complements.** Keyword, then value, repeated.
9. **Leftovers.** If a cross number was parsed, a trailing run of words with no digits is the locality. Anything else is `UNKNOWN_TOKEN`, one per token.
10. **Score and render.** Apply section 11, then build `canonical` and `normalized` (section 10).

`parse` never throws. Unparseable input returns `confidence: 0`, all fields `null` or empty, and the warnings that apply.

## 13. City notes

These notes describe nomenclature habits per city. They are working knowledge, not verified sources, so each one needs real addresses in the fixtures before we rely on it.

- **Bogotá:** `SUR` and `ESTE` are frequent. `NORTE` is not written. Numbered avenues use `AK` and `AC` (`AK 68`, `AC 26`). Named avenues (`Avenida Boyacá`, `Autopista Norte`) are common, see section 3.
- **Medellín:** `Circular` and `Transversal` are common in Laureles. Cross letters are frequent (`# 43D-45`).
- **Cali:** `NORTE` and `OESTE` are used routinely. In the north, `Av 6N # 23N-45` means *Avenida 6 Norte # 23 Norte - 45* (section 5).
- **Barranquilla:** plain `CL`/`KR` grid. Plates can have 3 digits.
- **Cartagena:** in the historic centre, many streets have names only (`Calle de la Factoría`). Outside it, the numeric grid applies.
- **Bucaramanga:** plain `CL`/`KR` grid, with `NORTE` in some sectors.

## 14. Open questions

1. The city notes in section 13 need real-address confirmation.
2. A trailing `NORTE` or `OESTE` after the plate could follow the same street-kind logic as `SUR` and `ESTE` (section 5): `NORTE` describing calles, `OESTE` carreras. For now they stay on the cross street.

## 15. Closed questions

Decided 2026-09-22.

| Question | Decision | Section |
|---|---|---|
| Named streets: capture the name? | Yes, in `streetName`, included in every output | 3 |
| Drop `UNCOMMON_QUADRANT`? | No, keep it as information only | 5 |
| Give OTRO codes their own types? | Not yet; `code` tells them apart | 7 |
| Allow plates over 3 digits? | No | 6 |
| A DANE or ICONTEC standard we missed? | No NTC found. IGAC's 2024 manual found and added as the `igac` style; the old default renamed `catastral` | 1 |
| Cali's `AV 6N`? | An attached `N` is `NORTE`, flagged | 5 |
| `Calle 48 # 5-20 Sur`? | A trailing quadrant follows the kind of street | 5 |
