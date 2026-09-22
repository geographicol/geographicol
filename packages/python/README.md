# geographicol

Normalize Colombian addresses into one canonical, structured form. Python 3.10+, zero dependencies.

| Input | Canonical (`igac`, default) | `dian` style |
|---|---|---|
| `Cra 45 No 12 30 Loc 3` | `KR 45 12 30 LC 3` | `CR 45 12 30 LC 3` |
| `cl. 26 nº 13-19` | `CL 26 13 19` | `CL 26 13 19` |
| `Av. Cra 68 #22 - 47` | `AK 68 22 47` | `AK 68 22 47` |
| `calle 38 a bis sur # 3A-18 este` | `CL 38A BIS SUR 3A 18 ESTE` | `CL 38A BIS SUR 3A 18 ESTE` |
| `KR45#12-30` | `KR 45 12 30` | `CR 45 12 30` |
| `Cll 147 No 7 70 To 2 Ap 501` | `CL 147 7 70 TO 2 APTO 501` | `CL 147 7 70 TO 2 AP 501` |
| `Kr 43A # 1-50 Ed San Fernando Of 801` | `KR 43A 1 50 ED SAN FERNANDO OF 801` | `CR 43A 1 50 ED SAN FERNANDO OF 801` |
| `Calle 8 # 530` | `CL 8 5 30`, confidence 0.8, warning `AMBIGUOUS_PLATE` | `CL 8 5 30` |

## Install

```sh
pip install geographicol
```

## Usage

```python
from geographicol import is_valid, normalize, parse

normalize("Cra 7 # 45-12 Torre 2 Apto 501")                # "KR 7 45 12 TO 2 APTO 501"
normalize("Cra 7 # 45-12 Torre 2 Apto 501", style="dian")  # "CR 7 45 12 TO 2 AP 501"
is_valid("Calle 45")  # False: no cross street
```

### Styles

| `style` | Codes | Use it for |
|---|---|---|
| `"igac"` (default) | IGAC cadastral table: `KR`, `APTO`, `PI` | Cadastre, municipalities, general storage |
| `"dian"` | DIAN table: `CR`, `AP`, `P` | RUT, tax forms, accounting and ERP software |
| `"readable"` | Full words: `Carrera 7 # 45-12, Torre 2` | Showing addresses to people |

Every style accepts codes from both tables as input. `strict=True` doubles every confidence penalty.

## `ParsedAddress`

```python
parse("Cra 7 # 45-12 Torre 2 Apto 501, Bogotá")
# ParsedAddress(
#     street_type="KR", street_number=7, street_letter=None, street_quadrant=None,
#     cross_number=45, cross_letter=None, cross_quadrant=None, plate_number=12,
#     complements=[
#         Complement(type="TORRE", code="TO", value="2"),
#         Complement(type="APARTAMENTO", code="APTO", value="501"),
#     ],
#     locality="Bogotá", department=None,
#     canonical="KR 7 45 12 TO 2 APTO 501",
#     normalized="Carrera 7 # 45-12, Torre 2, Apartamento 501",
#     confidence=1.0,
#     warnings=["LOCALITY_UNVERIFIED"],
#     raw="Cra 7 # 45-12 Torre 2 Apto 501, Bogotá",
# )
```

`ParsedAddress` is a dataclass, so `dataclasses.asdict()` turns it into a plain dict. `parse` never raises. When it can't make sense of the input, it says so through `confidence` (0 to 1) and machine-readable `warnings` instead of guessing silently. The full rules, codes and warning list are in [`docs/nomenclature.md`](https://github.com/geographicol/geographicol/blob/main/docs/nomenclature.md).

## What this library does NOT do

It normalizes the *syntax* of an address, offline, from the string alone. It does not:

- **Geocode:** no coordinates, no maps.
- **Validate against real addresses:** `KR 999 999 99` parses fine even though it doesn't exist.
- **Look up cities or neighbourhoods:** `locality` and `department` are captured as written and never checked (warning `LOCALITY_UNVERIFIED`).
- **Fix typos or fuzzy-match:** `Carerra` is not recognized.

Those need data and infrastructure, and will be part of the geographicol API.

## License

[MIT](https://github.com/geographicol/geographicol/blob/main/LICENSE)
