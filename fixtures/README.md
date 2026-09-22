# Fixtures

`addresses.json` is the contract: both the Node and Python libraries must pass 100% of it. The rules behind every expected value are in [`docs/nomenclature.md`](../docs/nomenclature.md).

## Group format

```json
{
  "id": "kr-45-12-30-local-3-variants",
  "note": "Optional. City, or why this case exists.",
  "inputs": ["Carrera 45 # 12-30 Local 3", "Cra 45 No 12 30 Loc 3"],
  "expected": {
    "streetType": "KR",
    "streetNumber": 45,
    "complements": [{ "type": "LOCAL", "code": "LC", "value": "3" }],
    "canonical": "KR 45 12 30 LC 3",
    "canonicalDian": "CR 45 12 30 LC 3",
    "normalized": "Carrera 45 # 12-30, Local 3",
    "warnings": []
  },
  "minConfidence": 1.0,
  "maxConfidence": 1.0
}
```

- `id`: unique kebab-case slug.
- `inputs`: every spelling that must produce the same result.
- `expected`: only the keys present are asserted.
  - `ParsedAddress` fields are compared exactly. `null` means the field must be `null`.
  - `canonical` is the default `igac` style.
  - `canonicalDian` is the `dian` style, tested with `{ style: "dian" }`.
  - `normalized` is the `readable` string.
  - `warnings` is compared as a set: same codes, order ignored.
- `minConfidence` / `maxConfidence`: bounds on `confidence`, compared with a tolerance of 1e-9.

## Adding a fixture

1. When a real-world input breaks the parser, add a group here **before** touching either implementation. If the right answer isn't clear from `docs/nomenclature.md`, add an open question there instead of guessing.
2. Prefer real-looking addresses and say which city they come from in `note`.
3. Update both libraries until both test suites pass. Never fix a case in one language only.
