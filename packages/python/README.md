# geographicol

Normalize Colombian addresses into one canonical, structured form. Python 3.10+, zero dependencies.

| Input | Canonical (`catastral`, default) | `dian` style |
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

normalize("Cra 7 # 45-12 Torre 2 Apto 501")  # "KR 7 45 12 TO 2 APTO 501"
normalize("Cra 7 # 45-12 Torre 2 Apto 501", style="dian")  # "CR 7 45 12 TO 2 AP 501"
is_valid("Calle 45")  # False: no cross street
```

### Styles

| `style` | Output | Use it for |
|---|---|---|
| `"catastral"` (default) | Compact cadastral codes: `KR 7 45 12 TO 2 APTO 501` | Storage, matching, a canonical key |
| `"igac"` | IGAC's 2024 cadastral manual: `Carrera 7 45 12 TO 2 AP 501` | Cadastre and municipal systems |
| `"dian"` | DIAN's table: `CR 7 45 12 TO 2 AP 501` | RUT, tax forms, accounting and ERP software |
| `"readable"` | Full words: `Carrera 7 # 45-12, Torre 2, Apartamento 501` | Showing addresses to people |

Every style accepts codes from all three tables as input. `strict=True` doubles every confidence penalty.

Named streets are supported: `Avenida Boyacá # 12-30` gives `street_name` `"BOYACÁ"` and the canonical string `AV BOYACÁ 12 30`.

## `ParsedAddress`

```python
parse("Cra 7 # 45-12 Torre 2 Apto 501, Bogotá")
# ParsedAddress(
#     street_type="KR", street_number=7, street_name=None, street_letter=None,
#     street_quadrant=None,
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
- **Look up cities or neighbourhoods:** `locality` and `department` are captured as written and never checked (warning `LOCALITY_UNVERIFIED`). To check them yourself, see [Municipality codes with colombia-open](#municipality-codes-with-colombia-open).
- **Fix typos or fuzzy-match:** `Carerra` is not recognized.

Those need data and infrastructure, and will be part of the geographicol API.

## Municipality codes with colombia-open

[colombia-open](https://pypi.org/project/colombia-open/) publishes DANE's municipality table, keyed by DIVIPOLA code. Matching geographicol's `locality` and `department` against that table gives each address a 5-digit municipality code. You can use the code to join the address to any other DANE-keyed data.

```sh
pip install geographicol colombia-open  # colombia-open needs Python 3.11+
```

```python
import re
import unicodedata

import polars as pl
from colombia_open import ColombiaOpen
from geographicol import parse


def clean(text):
    """Same cleaning colombia-open uses for its *_clean columns."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


# DANE uses official names: "Santiago de Cali", "Bogotá, D.C.", "Cartagena de Indias".
ALIASES = {
    "bogota": "bogota_d_c", "bogota_dc": "bogota_d_c", "d_c": "bogota_d_c",
    "cali": "santiago_de_cali", "cartagena": "cartagena_de_indias",
}

municipios = ColombiaOpen().load_polars("municipios").with_columns(
    pl.col("nombre_dpto").map_elements(clean, return_dtype=pl.String).alias("dpto_clean")
)


def divipola(address):
    """5-digit DIVIPOLA code for the address's municipality, or None if unknown or ambiguous."""
    a = parse(address)
    if not a.locality:
        return None
    name = ALIASES.get(clean(a.locality), clean(a.locality))
    rows = municipios.filter(pl.col("nombre_mpio_clean") == name)
    if a.department:
        dpto = ALIASES.get(clean(a.department), clean(a.department))
        rows = rows.filter(pl.col("dpto_clean") == dpto)
    return rows["cod_mpio"][0] if rows.height == 1 else None


divipola("Cra 45 # 12-30, Medellín, Antioquia")  # "05001"
divipola("Cl 5 # 38-25, Cali, Valle del Cauca")  # "76001"
divipola("Cl 49 # 50-21, Rionegro, Antioquia")   # "05615"
divipola("Cra 27 # 36-14, Rionegro")             # None: Antioquia and Santander both have one
```

- **Ambiguous names:** 67 municipality names occur in more than one department. Without a department, the recipe returns `None` for these instead of guessing.
- **First use:** `ColombiaOpen()` downloads its data bundle on first use and caches it. To work offline, set `COLOMBIA_OPEN_DATA_DIR`.
- **Matching:** names must match exactly once accents and punctuation are removed. Short forms and misspellings need an entry in `ALIASES`.
- **Data license:** DANE's tables are CC BY-SA 4.0. Credit DANE if you redistribute the codes.
- **Version:** tested with colombia-open 0.12.0. Its built-in `resolve_municipios` isn't used here because that release doesn't take a department, so it can return the wrong Rionegro.

## License

[MIT](https://github.com/geographicol/geographicol/blob/main/LICENSE)
