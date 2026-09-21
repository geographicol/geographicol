import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixturesPath = fileURLToPath(new URL("../../../fixtures/addresses.json", import.meta.url));
const fixtures: Array<{ id: string; inputs: string[] }> = JSON.parse(
  readFileSync(fixturesPath, "utf8"),
);

describe("fixtures", () => {
  it("loads the shared fixture file", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });
});
