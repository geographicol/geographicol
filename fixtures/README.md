# Fixtures

`addresses.json` is the contract: both the Node and Python libraries must pass 100% of it.

## Adding a fixture

1. Add a group to `addresses.json` **before** touching either implementation.
2. Fields:
   - `id` — unique kebab-case slug describing the case.
   - `inputs` — every spelling that must produce the same result.
   - `expected` — only the `ParsedAddress` fields you want asserted. Omitted fields are not checked.
   - `minConfidence` — the lowest acceptable `confidence` (optional).
   - `maxConfidence` — the highest acceptable `confidence`, for deliberately messy inputs (optional).
3. Update both libraries until both test suites pass. Never fix a case in one language only.
