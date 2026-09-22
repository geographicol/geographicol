import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface FixtureGroup {
  id: string;
  inputs: string[];
  expected: Record<string, unknown>;
  minConfidence?: number;
  maxConfidence?: number;
}

const fixturesPath = fileURLToPath(new URL("../../../fixtures/addresses.json", import.meta.url));
const fixtures: FixtureGroup[] = JSON.parse(readFileSync(fixturesPath, "utf8"));

// Structural checks only; per-input assertions arrive with the parser.
describe("fixtures file", () => {
  it("has at least 60 groups with unique ids", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(60);
    expect(new Set(fixtures.map((g) => g.id)).size).toBe(fixtures.length);
  });

  it("gives every group inputs, expectations and warnings", () => {
    for (const group of fixtures) {
      expect(group.inputs.length, group.id).toBeGreaterThan(0);
      expect(Array.isArray(group.expected.warnings), group.id).toBe(true);
    }
  });
});
