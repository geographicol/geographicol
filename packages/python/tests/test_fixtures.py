import json
from pathlib import Path

FIXTURES_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "addresses.json"
FIXTURES = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))


# Structural checks only; per-input assertions arrive with the parser.
def test_at_least_60_groups_with_unique_ids() -> None:
    assert len(FIXTURES) >= 60
    assert len({group["id"] for group in FIXTURES}) == len(FIXTURES)


def test_every_group_has_inputs_expectations_and_warnings() -> None:
    for group in FIXTURES:
        assert group["inputs"], group["id"]
        assert isinstance(group["expected"]["warnings"], list), group["id"]
