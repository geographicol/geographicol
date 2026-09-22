import json
import re
from dataclasses import asdict
from pathlib import Path
from typing import Any

import pytest

from geographicol import parse

FIXTURES_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "addresses.json"
FIXTURES: list[dict[str, Any]] = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))

TOLERANCE = 1e-9
STRING_KEYS = {"canonical", "canonicalDian", "normalized", "warnings"}
CASES = [
    pytest.param(group, input, id=f"{group['id']}[{index}]")
    for group in FIXTURES
    for index, input in enumerate(group["inputs"])
]


def snake_case(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def test_at_least_60_groups_with_unique_ids() -> None:
    assert len(FIXTURES) >= 60
    assert len({group["id"] for group in FIXTURES}) == len(FIXTURES)


@pytest.mark.parametrize(("group", "input"), CASES)
def test_fixture(group: dict[str, Any], input: str) -> None:
    result = parse(input)
    fields = asdict(result)
    expected = group["expected"]

    for key, value in expected.items():
        if key in STRING_KEYS:
            continue
        assert fields[snake_case(key)] == value, key
    if "canonical" in expected:
        assert result.canonical == expected["canonical"]
    if "canonicalDian" in expected:
        assert parse(input, style="dian").canonical == expected["canonicalDian"]
    if "normalized" in expected:
        assert result.normalized == expected["normalized"]
    if "warnings" in expected:
        assert sorted(result.warnings) == sorted(expected["warnings"])
    if "minConfidence" in group:
        assert result.confidence >= group["minConfidence"] - TOLERANCE
    if "maxConfidence" in group:
        assert result.confidence <= group["maxConfidence"] + TOLERANCE
