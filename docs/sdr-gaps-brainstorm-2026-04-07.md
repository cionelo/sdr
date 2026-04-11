# SDR — Gaps and Open Questions for Brainstorm
**Date:** 2026-04-07
**Purpose:** Reference doc for a brainstorm session to unblock SDR implementation.

---

## What's Built (for context)

| Layer | Status | Notes |
|-------|--------|-------|
| Repo infra | Done | .claude/CLAUDE.md, .gitignore, settings, git init |
| Python scaffolding | Done | 60+ files: config, constants, models, passes (stubbed), utils, tests, CLI, db client |
| Supabase migrations | Done (not applied) | 6 files: venues, seeds, normalization cols, profiles, race scores, altitude estimates |
| WA scoring coefficients | Done | 12 entries (6 events x 2 sexes), quadratic model, validated |
| Altitude parametric model | Done | Fitted from 4 NCAA data points, 154-row estimated table, <4% error on verified points |
| Altitude runtime utility | Done | `utils/altitude.py` — pure math, no scipy dependency |
| Coach-facing implementation guide | Done | `docs/sdr-implementation-guide.md` |
| Field mapping (gender, events) | Done | `utils/field_mapping.py` |
| CLI runner | Done | `cli.py` with pass2–5 + --dry-run |
| Supabase client | Done | `db.py` with get_client() |
| Frontend scaffold | Done | `apps/web/` — Vite + React + Tailwind, placeholder leaderboard page |
| All 4 passes (2–5) | **Stubbed only** | Function signatures + NotImplementedError |

---

## BLOCKERS — Need Your Direction

These are decisions that block actual implementation of one or more passes. Can't be resolved by reading the spec alone.

### B1. Baseline split curves — hardcode or derive?

**Affects:** Pass 4 (SDS calculation) — the core scoring pass.

The spec gives *approximate* expected split distributions per event (e.g., 800m: 51.3%/48.7% male). But it doesn't give a formula to generate a full personalized baseline curve from KsA + tier + finish time for 1500m–10K events.

**Options:**
- (a) Hardcode reference distributions per event as lookup tables, then scale by finish time
- (b) Derive curves dynamically from KsA archetype — needs a generation formula we'd have to design
- (c) Start with hardcoded (a) for v1, evolve to (b) in calibration phase

**Your call needed:** Which approach? If (a), are the percentages in the spec sufficient, or do we need more granular data (e.g., per-200m splits for 1500m)?

### B2. SDS score range and normalization

**Affects:** Pass 4 output, Pass 5 compositing.

The composite spec says `sds_normalized = sds_score * sds_normalization_factor` to map SDS onto the WA points scale. But the raw SDS range isn't defined anywhere.

**Need to decide:**
- What's the raw SDS range? Suggestion: 0–100 scale (50 = neutral pacing, 100 = elite execution, 0 = severe fade)
- What normalization factor maps that onto the WA point contribution at 15% weight?

### B3. Venue fuzzy matching — how meet locations map to venues

**Affects:** Pass 2 (altitude normalization).

The `/pace/` database stores `events.location` as free text. We need to map that to `sdr_venues.id` for altitude adjustment. The spec says "build a fuzzy matcher."

**Need to know:**
- What do actual location strings look like in your data? (e.g., "University Stadium - Albuquerque" vs "Albuquerque, NM" vs "UNM")
- Preference: curated alias table (most reliable, manual upkeep) vs. city/state substring matching (automatic, less precise)?

**Action:** Run `SELECT DISTINCT location FROM events WHERE location IS NOT NULL ORDER BY location` against Supabase to get the actual values — that determines the matching strategy.

### B4. Which /pace/ distance strings exist in Supabase?

**Affects:** Field mapping, Pass 2 event conversion.

The field mapping assumes `events.distance` contains strings like "800m", "1500m", "Mile", "5000m", etc. But the actual values in your database might differ (e.g., "800 Meters", "1 Mile", "5K").

**Action:** Run `SELECT DISTINCT distance FROM events ORDER BY distance` to get the exact values. This is a 30-second query that unblocks accurate field mapping.

### B5. Migrations — ready to apply?

**Affects:** Everything downstream.

6 migration files are drafted but not applied. They need review and then execution against the live Supabase instance.

**Questions before applying:**
- Are you comfortable with the additive columns on `results` (migration 003)? This is the one place SDR touches a /pace/ table.
- Should we apply to a Supabase branch first (if you have branching enabled), or go straight to the main database?
- Should the altitude estimates (migration 006) go in now, or after manual validation?

---

## DESIGN QUESTIONS — Need Brainstorming

These don't block v1 scaffolding but affect implementation quality and future extensibility.

### D1. Multi-season PR handling for KsA

KsA needs PRs at adjacent distances. The spec says "current season" for tier but is ambiguous for KsA.

- Current-season PRs: less data, more current
- Career PRs: more data, possibly stale (an athlete who ran 4:05 mile as a freshman and is now running 3:50)
- Hybrid: use career PRs but weight current season heavier

### D2. Athlete identity across team transfers

`/pace/` deduplicates by `(name, team_id)`. A transfer = new athlete_id. SDR would lose profile history.

- v1: ignore this (treat as new athlete). Acceptable?
- Later: could build a merge table mapping old → new athlete_id

### D3. Pass execution trigger model (post-CLI)

CLI-first is confirmed for v1. But after that:
- Post-ingestion hook: /pace/ triggers SDR passes after a meet is ingested
- Cron: nightly batch
- On-demand: coach hits "refresh" in the UI
- Some combo?

This affects UX (how stale are leaderboard scores?) and compute cost.

### D4. Coach auth and preset persistence

The build-your-own algorithm feature requires:
- Coach user accounts (Supabase Auth?)
- Saved preset configurations (per coach)
- Team-scoped access (coaches see their conference/athletes)

Not blocking v1, but the schema should leave room. Currently `sdr_composite` has a `preset` column but no `user_id`.

### D5. Leaderboard data contract

The pace/ visualizer queries Supabase directly from the browser client. Should SDR do the same?

- Direct Supabase queries: simpler, matches /pace/ pattern, RLS handles access
- Thin API layer: more control, caching, computed fields
- For v1, direct Supabase + RLS is probably fine

### D6. Outdoor season start date

The spec says "first Saturday in March." For 2026, that's March 7. Should this be:
- Hardcoded per year
- Computed (first Saturday of March)
- Configurable in coach settings

---

## VALIDATION ITEMS — Need Data or Research

These require external data gathering, not design decisions.

### V1. Altitude table validation

154 estimated values in migration 006. The model's highest adjustment (Adams State 10K = 8.66%) is aggressive. Validating the top-5 altitude venues against TFRRS converter would catch any model overshoot.

**Effort:** ~15 min manual TFRRS lookups for the 5 highest venues x 2 events each.

### V2. ABQ conversion table extraction

The UNM PDF (Dr. Ceronie) has Mile, 3000m, and 5000m conversion charts we haven't extracted yet. These would add 3 more verified data points to improve the parametric model fit.

**Effort:** Read the PDF, extract the constant percentages. ~20 min.

### V3. Remaining altitude venues

22 of 38 NCAA altitude venues are seeded. The missing ~16 are smaller D2/D3 programs. The TFRRS converter dropdown has the authoritative list.

**Effort:** Cross-reference TFRRS dropdown with public elevation data. ~30 min.

### V4. Actual distance strings in Supabase

Mentioned in B4 above. A single SQL query unblocks field mapping.

### V5. Actual location strings in Supabase

Mentioned in B3 above. A single SQL query unblocks venue matching.

---

## IMPLEMENTATION ORDER — Suggested Sprint Plan

Once blockers are resolved:

| Sprint | Pass | Dependencies | Effort |
|--------|------|-------------|--------|
| 1 | Apply migrations to Supabase | B5 resolved | 30 min |
| 2 | Pass 2 (normalization) | B3, B4 resolved | 1 session |
| 3 | Pass 3 (profiling: KsA + WA scoring + tier) | D1 decided | 1 session |
| 4 | Pass 4 (SDS calculation) | B1, B2 resolved | 1-2 sessions |
| 5 | Pass 5 (composite + aggregation) | Passes 2-4 working | 1 session |
| 6 | Frontend leaderboard (read-only) | Pass 5 producing data | 1 session |
| 7 | Preset config UI | D4 decided | 1 session |
| 8 | Backtesting harness | All passes working | 1 session |

**Critical path:** B1 and B2 are the hardest design questions. Everything else is either a quick data query (B3, B4, V4, V5) or a go/no-go decision (B5).
