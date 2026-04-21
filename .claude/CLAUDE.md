# SDR — Modular Track & Field Rating Tools

> Pivoted 2026-04-20. Legacy 5-pass algorithm preserved on `legacy-sdr-v1` branch.

## What This Is

SDR provides modular tools for collegiate track & field rating and analysis.
Shares a Supabase database with `/pace/` (ingestion + splits visualization).

**Current tools:**
- **Pass 2 — Altitude + Event Normalization** (implemented, tested)
- **WA Scoring Calculator** (implemented, tested)

**Planned tools (post-pivot):**
- **Splits Finder** — given a TFRRS link, find and display available split data
- **Altitude-Adjusted Leaderboard** — WA scoring + altitude normalization for fair rankings

## Architecture

```
TFRRS (source of truth for final times)
    ↓
Pass 2 — Altitude normalization + event conversion
    ↓
WA Scoring — Standardized points per performance
    ↓
Leaderboard — Ranked by altitude-adjusted WA points
```

Splits Finder is a separate tool path:
```
TFRRS link → anet search API → Firebase splits check → display
```

## Scope Boundary

- SDR only ADDS data to Supabase (new `sdr_*` tables, new columns on `results`)
- SDR NEVER modifies or deletes data written by /pace/ ingestion
- All SDR tables are prefixed `sdr_` to prevent namespace collisions

## Key Commands

```bash
source sdr/py/.venv/bin/activate                          # activate venv
python -m pytest sdr/py/tests/ -v                         # run tests
python -m pytest sdr/py/tests/ --cov=sdr.py --cov-report=term-missing  # coverage
python -m sdr.py.cli pass2                                # altitude normalization
python -m sdr.py.cli pass2 --dry-run                      # preview without writing
```

All commands run from `/PACE/` root (not from `sdr/`).

## Tech Stack

- Python 3.12+, pytest, TDD required (80%+ coverage)
- Supabase (shared instance with /pace/) — project ref: zlvtnrtkqfhkjimbpkmp
- Frontend: Vite + React + Tailwind

## Env

`.env` at `sdr/py/.env` — `SUPABASE_URL`, `SUPABASE_KEY` (or `SUPABASE_SERVICE_KEY`).
Frontend env at `sdr/apps/web/.env.local` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## What's Implemented

### Python (`py/`)

| Module | Purpose | Status |
|--------|---------|--------|
| `passes/pass2_normalize.py` | Altitude adjustment + Mile→1500m conversion | Tested |
| `utils/altitude.py` | Parametric altitude model (fitted from NCAA data) | Tested |
| `utils/wa_calculator.py` | WA 2025 scoring tables (quadratic formula) | Tested |
| `utils/field_mapping.py` | PACE↔SDR gender/event mapping | Tested |
| `utils/time_convert.py` | Time parsing + NCAA rounding | Tested |
| `constants/events.py` | Canonical event definitions | Reference |
| `constants/wa_scoring.py` | WA coefficients per event/sex | Reference |
| `models/race.py` | RawRace, NormalizedRace frozen dataclasses | Core |
| `cli.py` | CLI runner (pass2 only) | Working |
| `db.py` | Supabase client singleton | Working |

### Frontend (`apps/web/`)

Meets admin UI — list/filter/add/edit meets. Deployed to sdr-meets.vercel.app.
Needs repurposing for leaderboard + splits finder.

## Key References

- Algorithm design specs: `sdr/algorithm design/` (preserved for reference)
- WA scoring coefficients: Jeff Chen's parsed JSON
- Legacy 5-pass design: `git checkout legacy-sdr-v1`

## SDR Schema (updated 2026-04-20)

All migrations live on Supabase. Row counts as of 2026-04-20.

| Table | Migration | Rows | Notes |
|-------|-----------|------|-------|
| `sdr_venues` | 001 | 22 | Altitude venues seeded |
| `sdr_altitude_adjustments` | 001 + 006 | 154 | Per-venue-event lookup |
| `results.*` (9 cols) | 003 | 24,476 total | ~24K normalized, 313 with altitude venue links |
| `sdr_athlete_profiles` | 004 | 0 | Legacy table (deferred) |
| `sdr_race_sds` | 005 | 0 | Legacy table (deferred) |
| `sdr_composite` | 005 | 0 | Legacy table (deferred) |
| `meets` | 007 + 008 | 513 | All 1,041 events linked via meet_id |

`results` SDR columns: `venue_id`, `normalized_time_s`, `canonical_event`, `altitude_adjusted`, `altitude_adjustment_pct`, `event_converted`, `event_conversion_factor`, `normalization_version`, `normalization_pass_at`

## Field Mapping

PACE → SDR gender: "Men"→"male", "Women"→"female" (`sdr/py/utils/field_mapping.py`)
Distance variants (Mile, 5K, 3000m SC) → canonical events via `pace_distance_to_canonical()`

## Pivot Context

Full state doc: `/PACE/pace-sdr-state-and-pivot-2026-04-20.md`

Key decisions:
- WA points + altitude adjustment = the rating. No SDS pacing score in v1.
- TFRRS is source of truth for final times. Don't replicate their DB.
- Splits analysis is a separate tool, not baked into rankings.
- Legacy algorithm specs preserved on `legacy-sdr-v1` branch for future reference.
