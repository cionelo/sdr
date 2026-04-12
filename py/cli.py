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
    from datetime import date as _date
    from sdr.py.passes.pass2_normalize import normalize_race
    from sdr.py.models.race import RawRace

    sb = get_client()

    # Load altitude adjustment table: {venue_id: {event_distance: pct}}
    adj_rows = sb.table("sdr_altitude_adjustments").select("venue_id, event_distance, adjustment_pct").execute().data or []
    venue_adj: dict[str, dict[str, float]] = {}
    for row in adj_rows:
        venue_adj.setdefault(row["venue_id"], {})[row["event_distance"]] = float(row["adjustment_pct"])

    # Load altitude venues: {city_lower: (venue_id, elevation_ft)}
    venue_rows = sb.table("sdr_venues").select("id, city, elevation_ft").execute().data or []
    city_to_venue: dict[str, tuple[str, int]] = {
        v["city"].lower(): (v["id"], v["elevation_ft"])
        for v in venue_rows
        if v["city"]
    }

    # Load unnormalized results joined with event info (paginate 1000/page)
    result_rows = []
    page_size = 1000
    offset = 0
    while True:
        page = (
            sb.table("results")
            .select("id, athlete_id, event_id, time_s, events(date, location, distance, gender, season)")
            .is_("normalized_time_s", "null")
            .range(offset, offset + page_size - 1)
            .execute()
            .data or []
        )
        result_rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    print(f"[pass2] {len(result_rows)} results to normalize")

    if dry_run:
        for r in result_rows[:10]:
            ev = r.get("events") or {}
            print(f"  would normalize {r['id']} | {ev.get('distance')} {r['time_s']}s @ {ev.get('location')}")
        if len(result_rows) > 10:
            print(f"  ... and {len(result_rows) - 10} more")
        return

    updates = []
    skipped = 0
    for row in result_rows:
        if row.get("time_s") is None:
            skipped += 1
            continue
        ev = row.get("events") or {}
        location = ev.get("location") or ""
        distance = ev.get("distance") or ""
        raw_date = ev.get("date")
        race_date = _date.fromisoformat(raw_date) if raw_date else _date(1970, 1, 1)

        # Resolve venue from location city
        city = location.split(",")[0].strip().lower() if location else ""
        venue_match = city_to_venue.get(city)
        resolved_venue_id = venue_match[0] if venue_match else None
        adjustments = venue_adj.get(resolved_venue_id, {}) if resolved_venue_id else {}

        race = RawRace(
            result_id=str(row["id"]),
            athlete_id=str(row["athlete_id"]),
            event=distance,
            finish_time_sec=float(row["time_s"]),
            splits_sec=(),
            race_date=race_date,
            meet_id=str(ev.get("event_id", "")),
            venue_id=resolved_venue_id,
            gender=ev.get("gender") or "",
        )
        normalized = normalize_race(race, adjustments)
        updates.append({
            "id": row["id"],
            "venue_id": resolved_venue_id,
            "normalized_time_s": round(normalized.normalized_time_sec, 4),
            "canonical_event": normalized.canonical_event,
            "altitude_adjusted": normalized.altitude_adjusted,
            "altitude_adjustment_pct": round(normalized.altitude_adjustment_pct, 6) if normalized.altitude_adjustment_pct else None,
            "event_converted": normalized.event_converted,
            "event_conversion_factor": normalized.event_conversion_factor,
            "normalization_version": SDR_VERSION,
            "normalization_pass_at": "now()",
        })

    # Update each row — .update() is a partial PATCH (only modifies specified columns)
    written = 0
    for update in updates:
        row_id = update.pop("id")
        sb.table("results").update(update).eq("id", row_id).execute()
        written += 1
        if written % 100 == 0:
            print(f"  wrote {written}/{len(updates)}")

    if skipped:
        print(f"[pass2] skipped {skipped} results with null time_s")
    print(f"[pass2] done — {written} results normalized")


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
