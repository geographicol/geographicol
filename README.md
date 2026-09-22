# geographicol

*Geographical data for Colombia, built for developers.*

geographicol turns the many ways Colombians write an address — `Cra 45 No 12 30 Loc 3`, `KR 45 12 30 LC 3`, `Carrera 45 # 12-30 Local 3` — into one canonical, structured form. The first release is a pair of open-source, zero-dependency libraries that do syntactic normalization, with identical behavior and a shared test fixture set.

| Package | Language | Install |
|---|---|---|
| [`@geographicol/address`](packages/node) | TypeScript / JavaScript | `npm install @geographicol/address` |
| [`geographicol`](packages/python) | Python 3.10+ | `pip install geographicol` |

> Status: 0.2.0 released. Early days; the rules are in [`docs/nomenclature.md`](docs/nomenclature.md).

## License

[MIT](LICENSE)
