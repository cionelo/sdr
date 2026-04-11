"""SDR pipeline CLI runner.

Usage:
    python -m sdr.py.cli pass2              # altitude normalization
    python -m sdr.py.cli pass3              # athlete profiling
    python -m sdr.py.cli pass4              # SDS calculation
    python -m sdr.py.cli pass5              # SDR composite
    python -m sdr.py.cli pass2 --dry-run    # preview without writing
"""
import argparse
import sys
from typing import Callable

from sdr.py.config import SDR_VERSION
from sdr.py.db import get_client


def run_pass2(dry_run: bool = False) -> None:
    """Pass 2 — Altitude & event normalization."""
    sb = get_client()

    results = (
        sb.table("results")
        .select("id, athlete_id, event_id, time_s, race_date, meet_id")
        .is_("normalized_time_s", "null")
        .execute()
    )
    rows = results.data or []
    print(f"[pass2] {len(rows)} results to normalize")

    if dry_run:
        for r in rows[:10]:
            print(f"  would normalize result {r['id']} ({r['time_s']}s)")
        if len(rows) > 10:
            print(f"  ... and {len(rows) - 10} more")
        return

    from sdr.py.passes.pass2_normalize import normalize_race
    raise NotImplementedError("Pass 2 pipeline wiring pending — pass function is stubbed")


def run_pass3(dry_run: bool = False) -> None:
    """Pass 3 — Athlete profiling (KsA, archetype, tier)."""
    sb = get_client()

    athletes = (
        sb.table("athletes")
        .select("id, team_id")
        .execute()
    )
    rows = athletes.data or []
    print(f"[pass3] {len(rows)} athletes to profile")

    if dry_run:
        for a in rows[:10]:
            print(f"  would profile athlete {a['id']}")
        if len(rows) > 10:
            print(f"  ... and {len(rows) - 10} more")
        return

    from sdr.py.passes.pass3_profile import build_profile
    raise NotImplementedError("Pass 3 pipeline wiring pending — pass function is stubbed")


def run_pass4(dry_run: bool = False) -> None:
    """Pass 4 — Per-race SDS calculation."""
    sb = get_client()

    results = (
        sb.table("results")
        .select("id, athlete_id, event_id, time_s")
        .not_.is_("normalized_time_s", "null")
        .execute()
    )
    rows = results.data or []
    print(f"[pass4] {len(rows)} normalized results for SDS scoring")

    if dry_run:
        for r in rows[:10]:
            print(f"  would score result {r['id']}")
        if len(rows) > 10:
            print(f"  ... and {len(rows) - 10} more")
        return

    from sdr.py.passes.pass4_sds import compute_sds
    raise NotImplementedError("Pass 4 pipeline wiring pending — pass function is stubbed")


def run_pass5(dry_run: bool = False) -> None:
    """Pass 5 — Decay-weighted composite SDR."""
    sb = get_client()

    scores = (
        sb.table("sdr_race_sds")
        .select("result_id, athlete_id, event, sds_score")
        .execute()
    )
    rows = scores.data or []
    print(f"[pass5] {len(rows)} race scores for composite aggregation")

    if dry_run:
        athlete_events = set()
        for s in rows:
            athlete_events.add((s.get("athlete_id"), s.get("event")))
        print(f"  would compute composites for {len(athlete_events)} athlete-event pairs")
        return

    from sdr.py.passes.pass5_composite import compute_composite
    raise NotImplementedError("Pass 5 pipeline wiring pending — pass function is stubbed")


PASSES: dict[str, Callable] = {
    "pass2": run_pass2,
    "pass3": run_pass3,
    "pass4": run_pass4,
    "pass5": run_pass5,
}


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="sdr",
        description=f"SDR pipeline runner v{SDR_VERSION}",
    )
    parser.add_argument(
        "pass_name",
        choices=sorted(PASSES.keys()),
        help="which pass to run",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="show what would be processed without writing to database",
    )
    args = parser.parse_args()

    print(f"[sdr v{SDR_VERSION}] running {args.pass_name}" + (" (dry run)" if args.dry_run else ""))
    PASSES[args.pass_name](dry_run=args.dry_run)


if __name__ == "__main__":
    main()
