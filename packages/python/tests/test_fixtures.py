import json
from pathlib import Path

FIXTURES_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "addresses.json"


def test_fixtures_load() -> None:
    fixtures = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
    assert len(fixtures) > 0
