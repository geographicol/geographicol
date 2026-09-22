import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "../src/index.js";

interface FixtureGroup {
  id: string;
  inputs: string[];
  expected: Record<string, unknown>;
  minConfidence?: number;
  maxConfidence?: number;
}

const fixturesPath = fileURLToPath(new URL("../../../fixtures/addresses.json", import.meta.url));
const fixtures: FixtureGroup[] = JSON.parse(readFileSync(fixturesPath, "utf8"));

const TOLERANCE = 1e-9;
const STRING_KEYS = ["canonical", "canonicalDian", "normalized", "warnings"];

describe("fixtures file", () => {
  it("has at least 60 groups with unique ids", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(60);
    expect(new Set(fixtures.map((g) => g.id)).size).toBe(fixtures.length);
  });
});

describe.each(fixtures)("$id", (group) => {
  it.each(group.inputs)("%j", (input) => {
    const result = parse(input);
    const { expected } = group;

    for (const [key, value] of Object.entries(expected)) {
      if (STRING_KEYS.includes(key)) continue;
      expect(result[key as keyof typeof result], key).toEqual(value);
    }
    if ("canonical" in expected) expect(result.canonical).toBe(expected.canonical);
    if ("canonicalDian" in expected) {
      expect(parse(input, { style: "dian" }).canonical).toBe(expected.canonicalDian);
    }
    if ("normalized" in expected) expect(result.normalized).toBe(expected.normalized);
    if ("warnings" in expected) {
      expect([...result.warnings].sort()).toEqual([...(expected.warnings as string[])].sort());
    }
    if (group.minConfidence !== undefined) {
      expect(result.confidence).toBeGreaterThanOrEqual(group.minConfidence - TOLERANCE);
    }
    if (group.maxConfidence !== undefined) {
      expect(result.confidence).toBeLessThanOrEqual(group.maxConfidence + TOLERANCE);
    }
  });
});
