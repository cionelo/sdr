# Session: SDR Algorithm — Research & Design

## Objective

Design a **runner strength rating system** (SDR) for collegiate distance running. The rating compares athlete-vs-athlete strength for **seeding and ranking** — it does NOT predict race times.

Think ELO for runners, but informed by split dynamics and pacing patterns rather than just win/loss.

## Hard Constraints

- **No subjective metrics as primary factors.** Tactical race movement, pack position changes, lead duration — these are tiebreakers AT MOST. The rating must be grounded in measurable, objective performance data.
- **Individual performance is king.** An athlete's rating reflects what THEY did, not who they raced against (competition context is a minor adjustment, not a pillar).
- **Gender-specific scaling.** Men's and women's curves are biologically different — the rating system must account for this from the ground up.
- **Altitude normalization.** All times converted to sea-level equivalent before any scoring.

## Core Architecture (from voice notes)

### 1. Time Threshold Score (Primary Factor)

Anchored scale where landmark times map to rating points:

```
Example (men's 5K):
  sub-14:00 = 2000 pts
  sub-14:30 = ~1850 pts
  sub-15:00 = ~1700 pts
  ...
  16:30 = ~1000 pts
```

**Critical design requirement:** The curve must be **exponential at the elite end** — the difference between 13:25 and 13:30 should be worth MORE points than the difference between 16:25 and 16:30. Faster times are exponentially harder to achieve.

This needs to be defined for each event distance (800m through 10,000m) on both men's and women's sides.

**Research needed:**
- What curve shape best models the difficulty distribution? (logarithmic? logistic? custom?)
- How to calibrate anchor points per event per gender
- Reference: existing rating systems (World Athletics points tables, IAAF scoring tables) as starting points — don't reinvent what's already calibrated

### 2. Pacing Fingerprint (Secondary Factor — feeds into rating)

Per athlete, per distance: an accumulated picture of HOW they race, built from split history across multiple races.

```
Athlete X — 5K fingerprint:
  Typical 1K splits: 2:50 | 2:55 | 2:58 | 3:01 | 2:48
  Pattern: conservative start, moderate positive drift, strong close
  Fingerprint type: "closer"
```

**Research needed — this is the most important research task:**
- **Scott Christiansen's work on optimum race distribution models.** Find his research/data on ideal pacing for each distance (1500m, 3K, 5K, 10K). This is the baseline the fingerprint compares against.
- How to quantify deviation from optimal distribution
- How to distill a multi-race split history into a stable fingerprint
- Whether fingerprint should directly adjust rating or exist as a parallel metric (displayed alongside rating but not feeding into it)

### 3. Race-Count Stabilization

More races = more confident rating. Handle:
- New athletes (1-2 races): provisional rating, high uncertainty
- Established athletes (5+ races): stable, resistant to single-race swings
- Recency weighting: recent races matter more than old ones

**Research needed:**
- ELO-style K-factor decay vs. Bayesian updating vs. exponential weighted average
- What works best for a sport where athletes race ~8-15 times per season

### 4. Cross-Distance Conversion

A mile time and a 5K time from the same athlete should reinforce each other.

```
4:05 mile + 14:15 5K → consistent profile
4:05 mile + 15:30 5K → distance weakness signal
```

**Research needed:**
- Existing conversion tables (Peter Riegel formula, others)
- How to weight cross-distance data (less weight than same-distance data, but still informative)

### 5. Minor Adjustments (Tiebreaker Tier)

These should represent < 5% of total rating influence:
- **Competition strength index:** slight adjustment if the field was unusually strong/weak
- **Negative split bonus:** tiny bonus for demonstrating finishing capacity
- **Position movement:** only as tiebreaker between near-identical ratings

## Deliverables from This Session

1. **Research findings document** — Scott Christiansen pacing models, rating system comparisons (ELO/Glicko/World Athletics), time-to-points curve options
2. **Proposed formula spec** for each factor (or clear identification of what needs a second session to formalize)
3. **Data requirements confirmation** — exactly what fields per race feed each factor
4. **Open questions list** — anything that needs Nemo's coaching judgment to resolve

## What This Session Should NOT Do

- Write code
- Design database schemas
- Touch the frontend
- Build scraping logic
- Make final weighting decisions without flagging them for review

## Context

- Existing algorithm concept brief is in Notion: "PACE- algorithm brief md" — use as starting point but scrub subjective/tactical elements per constraints above
- PACE project lives at `/Users/ncionelo/Downloads/JOBS/PROJECTS/PACE/`
- The scraper for live.athletic.net results already exists in `/PACE/pace/` — this session doesn't touch it
- Target: have rating system ready for seeding test at Bryan Clay Invitational (mid-April 2026)
- This may split into 2 sessions: Research (B1) then Formalization (B2). That's fine — flag the split point if needed.
