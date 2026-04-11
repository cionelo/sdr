# SDR — Split Deviation Rating

## What This Is

SDR is a modular athlete rating algorithm for collegiate track & field.
It consumes ingested race data from PACE's existing Supabase database
and produces composite ratings per athlete per distance.

## Architecture

5-pass pipeline:

```
Pass 1 — Ingestion        (owned by /pace/, NOT this repo)
Pass 2 — Altitude Normalization
Pass 3 — Athlete Profiling (KsA, archetype, WA scoring, tier)
Pass 4 — SDS Calculation   (split deviation scoring per race)
Pass 5 — Aggregation       (decay-weighted composite SDR)
```

Each pass is independently re-runnable. Raw ingested data is never mutated.

## Scope Boundary (CRITICAL)

- SDR only ADDS data to Supabase (new `sdr_*` tables, new columns on `results`)
- SDR NEVER modifies or deletes data written by /pace/ ingestion
- All SDR tables are prefixed `sdr_` to prevent namespace collisions

## Key Commands

```bash
source sdr/py/.venv/bin/activate                          # activate venv
python -m pytest sdr/py/tests/ -v                         # run tests
python -m pytest sdr/py/tests/ --cov=sdr.py --cov-report=term-missing  # coverage
python -m sdr.py.cli pass2                                # altitude normalization
python -m sdr.py.cli pass3                                # athlete profiling
python -m sdr.py.cli pass4                                # SDS calculation
python -m sdr.py.cli pass5                                # SDR composite
python -m sdr.py.cli pass2 --dry-run                      # preview without writing
```

All commands run from `/PACE/` root (not from `sdr/`).

## Tech Stack

- Python 3.12+, pytest, TDD required (80%+ coverage)
- Supabase (shared instance with /pace/) — project ref: zlvtnrtkqfhkjimbpkmp
- Frontend: Vite + React + Tailwind (shares design system from /pace/apps/web/)

## Env

`.env` at `sdr/py/.env` — `SUPABASE_URL`, `SUPABASE_KEY` (or `SUPABASE_SERVICE_KEY`).
Frontend env at `sdr/apps/web/.env.local` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Key References

- Specs: `sdr/algorithm design/` — all methodology docs
- WA scoring coefficients: Jeff Chen's parsed JSON (github.com/jchen1/iaaf-scoring-tables)
- KsA research: Blödorn & Döring (2025), Scientific Reports + BMC Research Notes

## Future Features (keep in mind during all design)

- Build-your-own algorithm: coaches configure weights, presets, distance groups
- Indoor track support (separate baselines, facility indexing)
- Weather normalization
- Race-type contextual adjustments (championship vs invitational)

## Existing /pace/ Schema (read-only for SDR)

Tables: teams, events, athletes, results, splits
Gender values: "Men" / "Women" (map to "male"/"female" internally)
Time field: results.time_s (numeric seconds)
Distance field: events.distance (text, e.g., "5000m")

## SDR Schema (applied 2026-04-11)

All 6 migrations live on Supabase (shared instance). Applied via Management API.

| Table | Migration | Status |
|-------|-----------|--------|
| `sdr_venues` | 001 | Live — 22 altitude venues seeded |
| `sdr_altitude_adjustments` | 001 + 006 | Live — 154 model-interpolated rows + 1 verified |
| `results.*` (9 cols added) | 003 | Live — venue_id, normalized_time_s, canonical_event, altitude_adjusted, altitude_adjustment_pct, event_converted, event_conversion_factor, normalization_version, normalization_pass_at |
| `sdr_athlete_profiles` | 004 | Live — empty, populated by Pass 3 |
| `sdr_race_sds` | 005 | Live — empty, populated by Pass 4 |
| `sdr_composite` | 005 | Live — empty, populated by Pass 5 |

**B5 is resolved.** Next blockers: B3 (venue fuzzy matching) and B4 (distance string audit) — both need a single SQL query against live data.

## Field Mapping

PACE → SDR gender: "Men"→"male", "Women"→"female" (`sdr/py/utils/field_mapping.py`)
Distance variants (Mile, 5K, 3000m SC) → canonical events via `pace_distance_to_canonical()`

## Recent Checkpoints

- `~/.claude/checkpoints/chkpt-sdr-2026-04-11-1149.md` — repo bootstrap, env setup, GitHub repo created (cionelo/sdr)
- `~/.claude/checkpoints/checkpoint-2026-04-08-1447.md` — setup/overhead complete (venv, db.py, CLI, field mapping, pytest config, frontend scaffold)
