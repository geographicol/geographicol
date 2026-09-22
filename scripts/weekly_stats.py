#!/usr/bin/env python3
"""Weekly adoption check for geographicol: npm and PyPI downloads, GitHub stars, issues and traffic.

Run from anywhere:  python3 scripts/weekly_stats.py
Needs: Python 3.10+, and the GitHub CLI logged in (`gh auth login`) for the traffic numbers,
which only repository admins can see.

Each run appends a row to scripts/stats-history.csv (git-ignored) and compares with the last run.
Early numbers are mostly robots (mirrors, scanners): compare trends week over week, not totals.
"""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

NPM_PACKAGE = "@geographicol/address"
PYPI_PACKAGE = "geographicol"
REPO = "geographicol/geographicol"
HISTORY = Path(__file__).resolve().parent / "stats-history.csv"


def fetch_json(url: str, retries: int = 3) -> dict | list | None:
    """GET a JSON URL, retrying on rate limits. Returns None on failure, or when there's no data yet."""
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "geographicol-weekly-stats"})
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < retries - 1:
                time.sleep(10 * (attempt + 1))
                continue
            if error.code != 404:  # 404: the registry has no stats for this package yet
                print(f"  ! {url}: HTTP {error.code}", file=sys.stderr)
            return None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            print(f"  ! {url}: {error}", file=sys.stderr)
            return None
    return None


def sum_days(daily: dict[str, int], start: date, end: date) -> int:
    """Sum a {"YYYY-MM-DD": count} mapping over [start, end]."""
    return sum(n for day, n in daily.items() if start <= date.fromisoformat(day) <= end)


def windows(today: date) -> tuple[tuple[date, date], tuple[date, date]]:
    """The last 7 complete days, and the 7 before them. Today is excluded: its counts are partial."""
    end = today - timedelta(days=1)
    this_week = (end - timedelta(days=6), end)
    last_week = (end - timedelta(days=13), end - timedelta(days=7))
    return this_week, last_week


def npm_stats(today: date) -> dict[str, int | None]:
    this_week, last_week = windows(today)
    start = last_week[0].isoformat()
    data = fetch_json(f"https://api.npmjs.org/downloads/range/{start}:{this_week[1]}/{NPM_PACKAGE}")
    total = fetch_json(f"https://api.npmjs.org/downloads/point/2026-09-01:{today}/{NPM_PACKAGE}")
    if not isinstance(data, dict) or "downloads" not in data:
        return {"npm_week": None, "npm_prev_week": None, "npm_total": None}
    daily = {d["day"]: d["downloads"] for d in data["downloads"]}
    return {
        "npm_week": sum_days(daily, *this_week),
        "npm_prev_week": sum_days(daily, *last_week),
        "npm_total": total.get("downloads") if isinstance(total, dict) else None,
    }


def pypi_stats(today: date) -> dict[str, int | None]:
    """Downloads excluding PyPI mirrors, which re-download every package automatically."""
    this_week, last_week = windows(today)
    data = fetch_json(f"https://pypistats.org/api/packages/{PYPI_PACKAGE}/overall?mirrors=false")
    if not isinstance(data, dict) or "data" not in data:
        return {"pypi_week": None, "pypi_prev_week": None, "pypi_total": None}
    daily: dict[str, int] = {}
    for row in data["data"]:
        if row.get("category") == "without_mirrors":
            daily[row["date"]] = daily.get(row["date"], 0) + row["downloads"]
    return {
        "pypi_week": sum_days(daily, *this_week),
        "pypi_prev_week": sum_days(daily, *last_week),
        "pypi_total": sum(daily.values()),
    }


def gh_api(path: str) -> dict | list | None:
    try:
        result = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=30, check=True)
        return json.loads(result.stdout)
    except FileNotFoundError:
        print("  ! gh CLI not found; skipping GitHub numbers", file=sys.stderr)
    except subprocess.CalledProcessError as error:
        print(f"  ! gh api {path}: {error.stderr.strip()}", file=sys.stderr)
    except (subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        print(f"  ! gh api {path}: {error}", file=sys.stderr)
    return None


def github_stats() -> tuple[dict[str, int | None], list[dict]]:
    repo = gh_api(f"repos/{REPO}")
    views = gh_api(f"repos/{REPO}/traffic/views")
    clones = gh_api(f"repos/{REPO}/traffic/clones")
    referrers = gh_api(f"repos/{REPO}/traffic/popular/referrers")
    issues = gh_api(f"search/issues?q=repo:{REPO}+type:issue")
    stats: dict[str, int | None] = {
        "stars": repo.get("stargazers_count") if isinstance(repo, dict) else None,
        "forks": repo.get("forks_count") if isinstance(repo, dict) else None,
        "watchers": repo.get("subscribers_count") if isinstance(repo, dict) else None,
        "issues_total": issues.get("total_count") if isinstance(issues, dict) else None,
        # GitHub traffic covers the last 14 days.
        "views_14d": views.get("count") if isinstance(views, dict) else None,
        "visitors_14d": views.get("uniques") if isinstance(views, dict) else None,
        "clones_14d": clones.get("count") if isinstance(clones, dict) else None,
        "cloners_14d": clones.get("uniques") if isinstance(clones, dict) else None,
    }
    return stats, referrers if isinstance(referrers, list) else []


def last_run() -> dict[str, str] | None:
    if not HISTORY.exists():
        return None
    with HISTORY.open(newline="") as file:
        rows = list(csv.DictReader(file))
    return rows[-1] if rows else None


def save(row: dict[str, object]) -> None:
    new_file = not HISTORY.exists()
    with HISTORY.open("a", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(row))
        if new_file:
            writer.writeheader()
        writer.writerow(row)


def show(value: int | None) -> str:
    return "n/a" if value is None else str(value)


def change(now: int | None, before: int | str | None) -> str:
    if now is None:
        return "n/a"
    if before in (None, ""):
        return str(now)
    diff = now - int(before)
    return f"{now} ({'+' if diff >= 0 else ''}{diff})"


def trend(week: int | None, prev: int | None) -> str:
    if week is None:
        return "no data yet (stats appear a few days after release)"
    if prev is None:
        return str(week)
    if prev == 0:
        return f"{week} (prev 7d: 0)"
    pct = round((week - prev) / prev * 100)
    return f"{week} (prev 7d: {prev}, {'+' if pct >= 0 else ''}{pct}%)"


def main() -> None:
    today = date.today()
    this_week, _ = windows(today)
    print(f"geographicol weekly stats: {today}  (downloads: {this_week[0]} to {this_week[1]})\n")

    npm, pypi = npm_stats(today), pypi_stats(today)
    github, referrers = github_stats()
    previous = last_run()

    print("Downloads, last 7 complete days")
    print(f"  npm   {NPM_PACKAGE:24} {trend(npm['npm_week'], npm['npm_prev_week'])}")
    print(
        f"  PyPI  {PYPI_PACKAGE:24} {trend(pypi['pypi_week'], pypi['pypi_prev_week'])}   (mirrors excluded)"
    )
    totals = f"npm {show(npm['npm_total'])}, PyPI {show(pypi['pypi_total'])}"
    print(f"  Total since release: {totals}")

    since = f"  (change since {previous['date']})" if previous else ""
    print(f"\nGitHub{since}")
    for key, label in [
        ("stars", "Stars"),
        ("forks", "Forks"),
        ("watchers", "Watchers"),
        ("issues_total", "Issues opened"),
    ]:
        print(f"  {label:15} {change(github[key], previous.get(key) if previous else None)}")
    print(
        f"  Views, 14 days  {show(github['views_14d'])} from {show(github['visitors_14d'])} visitors;"
        f" clones {show(github['clones_14d'])} by {show(github['cloners_14d'])}"
    )
    if referrers:
        print("  Top referrers:  " + ", ".join(f"{r['referrer']} ({r['uniques']})" for r in referrers[:5]))

    save(
        {
            "date": today.isoformat(),
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            **npm,
            **pypi,
            **github,
        }
    )
    print(f"\nSaved to {HISTORY}")
    print("Reminder: early downloads are mostly robots. Look for growth week over week, and for real issues.")


if __name__ == "__main__":
    main()
