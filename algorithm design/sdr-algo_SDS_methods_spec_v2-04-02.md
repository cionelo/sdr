# PACE — Split Deviation Score (SDS) Methodology
**Component:** Athlete Rating Algorithm — Split Distribution Module
**Version:** 2.0
**Date:** 2026-04-02
**Status:** Pre-implementation spec. For use as AI implementation brief.

---

## 1. Purpose and Scope

The Split Deviation Score (SDS) is one modular factor within PACE's composite athlete rating system (SDR). It quantifies how well an athlete distributed their effort within a single race relative to a physiologically grounded baseline, and extracts a fitness signal that a finish time alone cannot provide.

SDS serves two functions:
- **Per-race analysis** — scored for every ingested race with valid split data
- **Seeding input** — feeds into the larger SDR composite rating, with coach-configurable weighting

SDS is explicitly **not** a standalone rating. It is one lens among several (tactical rating, season history rating, KsA fitness profile, etc.) that coaches combine with configurable weights via PACE's modular rating interface.

**Events in scope (v1):** 800m, 1500m, Mile, 3000m, 3000m Steeplechase, 5000m, 10000m — outdoor track only, FAT timing on 400m oval. Indoor track and steeplechase-specific terrain modeling deferred to v2.

---

## 2. System Architecture: Separation of Concerns

**Critical design principle: ingestion and calculation are strictly separated into independent passes. No algorithm computation occurs at ingestion time.**

Ingestion is a data pipeline. Calculation passes are analytical pipelines. They run independently, can be re-run without re-ingesting, and can be versioned separately. This enables modular upgrades — if the SDS formula changes, Pass 4 reruns against existing normalized data without touching the database or re-scraping anything.

### 2.1 Pass sequence

```
Pass 1 — Ingestion
  Scrape raw results from live.DirectAthletics, Hy-Tek / Flash Results
  Parse splits, finish times, athlete identity, meet metadata
  Normalize field names and units
  Validate data quality (FAT confirmed, splits complete)
  Write raw records to Supabase
  Flag: data_quality, timing_method, split_completeness

Pass 2 — Altitude Normalization
  Read raw times from Supabase
  Identify meet venue altitude from meet metadata
  Convert all times to sea-level equivalents
  Write normalized times alongside raw times (raw times preserved)
  Flag: altitude_adjusted (bool), altitude_m, conversion_method
  → All downstream passes operate on normalized times only

Pass 3 — Athlete Profiling
  Read normalized times across all distances for athlete
  Compute KsA values at each adjacent distance pair
  Classify aerobic/anaerobic archetype from KsA profile
    (fallback: time-pattern inference if multi-distance data unavailable)
  Assign WA points per race → derive performance tier
  Set confidence flags: ksa_confidence, tier_confidence
  Write profile to athlete record in Supabase

Pass 4 — SDS Calculation
  Read normalized splits + athlete profile from Supabase
  Generate personalized baseline curve (KsA archetype + tier + sex + finish time)
  Compute per-lap raw deviation
  Apply directional asymmetry rules by event
  Compute CVI, execution delta, fade penalty
  Compute composite SDS per race
  Write SDS score + confidence flags to race record

Pass 5 — Aggregation & SDR Composite
  Read per-race SDS scores for athlete across season
  Apply exponential decay weighting by days since race
  Compute decay-weighted season SDS aggregate
  Combine with other SDR modules (coach-configured weights)
  Write composite SDR to athlete record
```

### 2.2 Re-run behavior
Any pass can be re-run in isolation. If the SDS formula is updated, only Pass 4 and Pass 5 rerun. If a new altitude conversion method is adopted, Pass 2 reruns and all downstream passes follow. Raw ingested data in Supabase is never mutated by calculation passes.

---

## 3. Pass 1 — Ingestion

Ingestion is strictly limited to:
- Scraping split and result data from live.DirectAthletics and Hy-Tek / Flash Results sources
- Parsing and normalizing field names, units, and athlete identity
- Validating data completeness and timing method
- Writing raw records to Supabase

**No calculations are performed during ingestion.** Classification, scoring, and profiling are deferred to subsequent passes.

### 3.1 Accepted meet sources
- live.DirectAthletics
- Hy-Tek / Flash Results hosted meet results
- FAT-timed outdoor meets with 400m lap splits (95%+ of major collegiate distance meets)

### 3.2 Data quality flags (set at ingestion)
```
data_quality:      "verified_fat" | "incomplete_splits" | "missing_splits" | "excluded"
timing_method:     "FAT" | "hand" | "unknown"
split_completeness: "full" | "partial" | "none"
```
SDS (Pass 4) only runs on records where `data_quality = "verified_fat"` and `split_completeness = "full"`. Partial records are ingested and stored but SDS is null with reason code.

### 3.3 Minimum fields per ingested race record
```
athlete_id, event, finish_time_raw, date, meet_id, meet_source,
venue_name, venue_altitude_m,
splits_raw: [lap_1, lap_2, ...lap_n],   // 400m intervals, raw times
data_quality, timing_method, split_completeness
```

---

## 4. Pass 2 — Altitude Normalization

All times are converted to sea-level equivalents before any profiling or scoring. This ensures KsA values, tier assignments, and SDS calculations are physiologically comparable across athletes racing at different venues.

### 4.1 Conversion method
PACE will use the same altitude-to-sea-level conversion methodology as TFRRS (https://tfrrs.org/conversion).

> ⚠️ **Research required before implementation:** TFRRS does not publish an open API or document their conversion formula publicly. The specific model must be reverse-engineered or confirmed before Pass 2 can be built. This is a hard dependency for all downstream passes. Candidate models include Péronnet-Thibault altitude adjustment and empirically fitted corrections from published exercise physiology literature. Resolution of this research item is a prerequisite for v1 launch.

### 4.2 Fields written by Pass 2
```
finish_time_normalized,        // sea-level equivalent, used by all downstream passes
splits_normalized: [...],      // per-lap sea-level equivalents
altitude_adjusted: bool,
altitude_m: int,
conversion_method: string      // version/method identifier for auditability
```
Raw times are preserved. Normalized times are written as separate fields.

---

## 5. Pass 3 — Athlete Profiling

Athlete profiling runs after altitude normalization. It establishes the physiological context required by Pass 4 to generate a personalized split baseline. All inputs are normalized times.

### 5.1 KsA — Coefficient of Special Endurance

KsA quantifies relative pace loss between adjacent race distances:
```
KsA = pace_shorter_distance / pace_longer_distance
```
Higher KsA (closer to 1.0) = less pace loss = stronger aerobic endurance relative to speed.
Lower KsA = more anaerobic/speed-dominant profile.

**Research foundation:**
- Male baselines: Blödorn & Döring (2025), *Scientific Reports* — 14,000+ race times, validated from international to regional level
- Female baselines: Blödorn & Döring (2025), *BMC Research Notes* — 20,000+ race times, same methodology. Females show more pronounced pace loss from 100m–1500m than males; values converge at 5000m+. Sex-specific tables required for 800m and 1500m.

**Reference KsA values (median, research-derived):**

| Distance pair | Male KsA | Female KsA |
|---|---|---|
| 400m/800m | 0.888 | 0.880 |
| 800m/1500m | 0.921 | 0.915 |
| 1500m/3000m | 0.923 | 0.926 |
| 3000m/5000m | 0.967 | 0.963 |
| 5000m/10000m | 0.954 | 0.956 |

Note: research baselines are calibrated on German national and elite runners. Empirical recalibration against collegiate-specific data is planned (see Section 9).

**KsA computation:**
For each athlete, compute personal KsA wherever adjacent-distance normalized PRs exist:
```
athlete_ksa_800_1500  = athlete_pace_800_normalized / athlete_pace_1500_normalized
athlete_ksa_1500_5000 = athlete_pace_1500_normalized / athlete_pace_5000_normalized
athlete_ksa_5000_10000 = athlete_pace_5000_normalized / athlete_pace_10000_normalized
```

### 5.2 Aerobic/Anaerobic Archetype Classification

Archetype classification uses KsA profile as primary input, with time-pattern inference as fallback when multi-distance data is unavailable.

**Primary path — KsA-based classification:**

The ratio between the athlete's speed-endurance KsA (800m/1500m) and their aerobic endurance KsA (1500m/5K or 5K/10K) determines archetype. The KsA paper provides the physiological basis: low 800/1500 KsA relative to research median indicates anaerobic dominance; high 1500/5K KsA relative to median indicates aerobic dominance.

```
speed_endurance_score  = athlete_ksa_800_1500 / reference_ksa_800_1500
aerobic_endurance_score = athlete_ksa_1500_5000 / reference_ksa_1500_5000

archetype_ratio = aerobic_endurance_score / speed_endurance_score
```

Classification thresholds (approximate — to be validated against empirical data):
```
archetype_ratio > 1.10  → aerobic_dominant
archetype_ratio < 0.90  → anaerobic_dominant
0.90 ≤ ratio ≤ 1.10     → hybrid
```

Practically: a 2:00 800m / 30:31 10K athlete has a very low speed-endurance KsA and a high aerobic KsA — aerobic dominant. A 3:50 1500m / 15:00 5K athlete has a high speed-endurance KsA and a moderate aerobic KsA — anaerobic dominant. These extreme cases are unambiguous. The KsA thresholds handle the middle ground more precisely than time-pattern rules alone.

> ⚠️ **Note:** A perfectly statistically correct archetype classification is not the goal. The classification exists to select the appropriate split baseline curve and adjust SDS penalty/reward thresholds. A reasonable approximate classification (e.g. 55% aerobic / 45% anaerobic weighting) is sufficient for v1. Refine thresholds once empirical calibration data is available.

**Fallback path — time-pattern inference (no multi-distance data):**

When only a single distance is available, archetype is inferred from event context and performance tier:
- 800m-primary athletes with no 1500m/5K data → default hybrid, flag as `ksa_confidence: minimal`
- 5K/10K primary athletes with no 800m/1500m data → default aerobic_dominant, flag accordingly
- Archetype assigned from time-pattern heuristics is always lower confidence than KsA-derived

### 5.3 KsA Confidence Flag
```
ksa_confidence: "full"     // PRs at 3+ adjacent distances, current season
              | "partial"  // PRs at 2 adjacent distances or prior season
              | "minimal"  // single distance only, fallback to tier baseline
              | "none"     // no PR data, generic tier + sex baseline only
```

### 5.4 Performance Tier Assignment — World Athletics Scoring Tables

**Framework:** World Athletics Scoring Tables (2022/2025 revision) are the primary anchor for tier assignment. These are empirically fitted power-law curves calibrated against real-world competitive performances across all events and sexes, providing cross-distance normalization that PACE does not need to solve independently.

**Formula:**
```
P = a · (−T − b)^c
```
Where `T` is finish time in seconds, and `a`, `b`, `c` are event-specific and sex-specific fitted constants.

**Implementation — Option C (hybrid):**
- Tier boundary definitions use table lookup (authoritative anchors from WA PDFs)
- Live scoring uses fitted coefficients for fast inline computation
- Source for coefficients: Jeff Chen's reverse-engineered parsed JSON (R² > 0.999 for all events)
  - Methodology: https://jeffchen.dev/posts/Calculating-World-Athletics-Coefficients/
  - Open-source JSON + calculator: https://github.com/jchen1/iaaf-scoring-tables

**Tier buckets (internal labels, cross-distance via WA points):**

| Tier | WA Points | 5K approx (M) | Context |
|---|---|---|---|
| S | 1100+ | sub-13:20 | Post-collegiate elite / Olympic bubble |
| A | 950–1100 | 13:20–13:55 | NCAA D1 All-American range |
| B | 850–950 | 13:55–14:30 | NCAA D1 competitive scorer |
| C | 750–850 | 14:30–15:10 | D2 All-American / D1 fringe |
| D | 650–750 | 15:10–16:00 | Mid-pack D2 / D3 competitive |
| E | 500–650 | 16:00–17:30 | JUCO / developmental |

Point ranges hold cross-distance. Example times are 5K male only — use WA scoring tables directly for all other events and for female tier boundaries.

**Tier confidence flag:**
```
tier_confidence: "confirmed"  // WA points from 2+ races this season
               | "estimated"  // single race or prior season PR
               | "low"        // seed time only, no verified race result
```

### 5.5 Fields written by Pass 3
```
ksa_800_1500, ksa_1500_5000, ksa_5000_10000,   // computed where data exists
archetype: "aerobic_dominant" | "anaerobic_dominant" | "hybrid",
archetype_path: "ksa_derived" | "time_pattern_inferred",
ksa_confidence, tier, wa_points, tier_confidence
```

---

## 6. Pass 4 — SDS Calculation

SDS calculation reads normalized split data and athlete profile from Supabase. No scraping, no normalization, no profiling occurs in this pass.

### 6.1 Baseline curve generation

For each race, PACE generates a personalized expected split distribution using:
1. **KsA archetype** → curve shape (how aggressive the pace decay)
2. **Performance tier** → tier-appropriate scaling
3. **Sex** → sex-specific KsA values for 800m and 1500m
4. **Normalized finish time** → scales curve to absolute expected split times

Every SDS calculation has a personalized baseline. A 1:52 800m runner with KsA 0.900 has a different expected curve than a 1:52 runner with KsA 0.935.

**Reverse engineering from finish time:**
When split history is unavailable (first ingestion of an athlete), PACE reverse-engineers the expected split ladder from finish time + KsA profile alone:
```
finish_time_normalized + ksa_archetype → baseline_curve → per-lap expected splits
```
Before this reverse engineering runs, all times must be altitude-normalized (Pass 2). This is why the pass sequence is strictly ordered.

### 6.2 Expected curve shapes by event

**800m**
- Baseline: positive split (~51.3% lap 1 / 48.7% lap 2, male; ~51.8% / 48.2% female)
- Physiological basis: 800m classified as extended sprint; anaerobic energy reserves near-maximal in lap 1; positive split is biomechanically optimal
- Tolerance window: ±3% before penalty/reward triggers
- Anaerobic-dominant athletes: wider positive split tolerance (higher KsA 800/1500 = more speed-endurance capacity)

**1500m / Mile**
- Baseline: surge-even-kick (first 300m slightly elevated, middle even, final 300m kick)
- Approximate 400m lap distribution: 26.5% / 26.0% / 25.8% / 21.7% (last lap proportional)
- Even to slight negative overall is performance-optimal

**3000m / Steeplechase**
- Baseline: even to slight negative
- Steeplechase: water jump and barrier placement introduces legitimate per-lap variance not attributable to pacing. Steeple SDS uses the 3000m flat baseline with elevated lap-level variance tolerance. Steeple-specific terrain modeling (barrier frequency per lap, water jump lap flags) deferred to v2.

**5000m**
- Baseline: even with controlled opening km, accelerating final km
- Approximate 1km split distribution: 20.4% / 20.2% / 20.0% / 19.8% / 19.6%
- Strong closing velocity index is a positive fitness signal

**10000m**
- Baseline: even to slight negative; larger mid-race variance tolerance than 5K
- Approximate 2km split distribution: flat with 3–4% acceleration in final 2km

### 6.3 Raw deviation
```
raw_deviation_lap_n = actual_split_pct_n - baseline_split_pct_n
```
Signed. Positive = faster than baseline (went out hard). Negative = more conservative than baseline.

### 6.4 Directional asymmetry by event

**800m**
```
deviation > +0.03   → penalty (overcooked opening lap)
deviation < -0.02   → mild flag (unusually conservative; may indicate tactical race or undertaper)
-0.02 to +0.03      → neutral to slight positive
```
Penalty threshold widens proportionally with athlete's anaerobic KsA.

**1500m–10000m**
```
deviation > +0.025  → penalty (positive split fade)
deviation < -0.015  → bonus (controlled open, fitness signal)
CVI = last_lap_pace / avg_lap_pace
CVI > 1.02          → additional bonus (genuine kick, fitness above finish time)
```

### 6.5 Implied fitness ceiling
```
implied_fitness_time = extrapolate_to_full_distance(first_half_normalized_pace)
execution_delta = implied_fitness_time − actual_finish_time_normalized
```
Negative execution_delta (implied faster than actual) = fitness-above-finish-time signal. Feeds `execution_delta_adjustment` in composite SDS. Normalized against event, tier, and season phase as empirical database grows.

### 6.6 Composite SDS formula
```
SDS = base_time_score
    + (ksa_archetype_weight × deviation_score)
    + closing_velocity_bonus
    − fade_penalty
    + execution_delta_adjustment
```
All components bounded to prevent single-factor dominance. SDS stored per race — not averaged at this pass.

### 6.7 SDS confidence flags
```
sds_confidence:   "high" | "medium" | "low" | "insufficient"
baseline_source:  "empirical_calibrated" | "empirical_bootstrap" | "theoretical"
```
`sds_confidence` is a composite of `ksa_confidence`, `split_confidence`, and `tier_confidence` from upstream passes. `baseline_source` surfaces which generation of empirical calibration the score was derived from (see Section 9).

### 6.8 Fields written by Pass 4
```
sds_score, sds_confidence, baseline_source,
closing_velocity_index, execution_delta,
per_lap_deviation: [...],
fade_penalty_applied: bool,
ksa_archetype_weight_used
```

---

## 7. Pass 5 — Aggregation and SDR Composite

### 7.1 Decay-weighted season SDS
SDS scores across a season are aggregated using exponential decay weighting — not straight averaging:
```
weight_n = e^(−λ × days_since_race)
```
Recommended starting λ: decay half-life of ~21–28 days during competitive season. A race from 8 weeks ago carries ~10–15% of the weight of last week's race. Exact λ should be validated against early empirical data before hardcoding.

### 7.2 Volume and consistency benefit
More races increase rating confidence, not raw score. Volume benefit is expressed as:
- Tighter confidence intervals on aggregated SDS
- Reduced regression-to-mean
- Consistency signal: low SDS variance across a season is an independent positive indicator of strength

Racing consistency (stable SDS across multiple races) is treated as a separate positive signal from raw SDS magnitude. An athlete with 6 consistent races is more confidently rated than one with 2, regardless of score level.

### 7.3 Fatigue modeling
Race frequency within a rolling 21-day window is captured as a covariate. Systematic positive split drift over a congested schedule is flagged as potential fatigue artifact — it does not degrade SDS directly but informs the `season_history_rating` module and is surfaced to coaches.

### 7.4 Coach-configurable SDR composite
SDR is a build-your-own rating. Coaches configure which factors apply and at what weight. SDS can be applied:
- Per-race (view SDS for any single race)
- As PR-based score at a specific distance
- As decay-weighted season aggregate
- Excluded entirely (time-only seeding)

Tactical rating, season history, KsA archetype, and SDS are all independent modules combined at the SDR output layer. Modular separation means a coach can zero out any factor and still get valid output from the remaining modules.

---

## 8. Athlete Profile Data Model

Minimum fields per athlete record:
```
athlete_id, name, sex, team, grad_year,

// Per race
races: [{
  race_id, event, date, meet_id, meet_source,
  venue_name, venue_altitude_m,
  finish_time_raw, finish_time_normalized,
  splits_raw: [...], splits_normalized: [...],
  altitude_adjusted, altitude_m, conversion_method,
  data_quality, timing_method, split_completeness,
  sds_score, sds_confidence, baseline_source,
  closing_velocity_index, execution_delta,
  per_lap_deviation: [...], fade_penalty_applied,
  ksa_archetype_weight_used
}],

// Athlete profile (Pass 3 outputs)
ksa_800_1500, ksa_1500_5000, ksa_5000_10000,
archetype, archetype_path, ksa_confidence,
tier, wa_points, tier_confidence,

// Aggregated (Pass 5 outputs)
season_sds_aggregate, season_sds_confidence,
race_count_season, consistency_score
```

---

## 9. Self-Improving Empirical Baseline

### Phase 1 — Bootstrap (launch → ~30 major meets)
- Baselines derived from KsA research values and Tokyo pacing model
- `baseline_source: "theoretical"`
- Valid scores but calibrated against elite/national research baselines, not collegiate norms
- Coaches informed scores reflect theoretical priors during this phase

### Phase 2 — Calibration (~30–150 meets)
- Empirical baselines computed from PACE database, stratified by event, tier, and sex
- Divergence from theoretical baselines logged
- `baseline_source: "empirical_bootstrap"`
- Expected: collegiate D2/D3 baselines will diverge from elite-calibrated research values, particularly at developmental tier

### Phase 3 — Mature (150+ meets, ongoing)
- PACE empirical database is primary baseline source
- KsA research values used for validation and outlier detection only
- `baseline_source: "empirical_calibrated"`
- Baselines recalibrated on rolling basis as meets are ingested

**Cold start communication:** `baseline_source` is surfaced prominently in coach-facing outputs during Phases 1 and 2. This prevents coaches from over-interpreting early SDS scores and protects trust as calibration improves.

---

## 10. Open Research Items

| Area | Priority | Notes |
|---|---|---|
| Altitude conversion methodology | **P0 — hard dependency** | TFRRS uses an undocumented conversion (https://tfrrs.org/conversion). Must be reverse-engineered or independently sourced before Pass 2 can be built. All downstream passes depend on this. |
| KsA archetype classification thresholds | **P1** | Ratio thresholds (0.90 / 1.10) are reasonable starting estimates. Validate against empirical data once calibration phase begins. |
| Collegiate-specific KsA values | **P1** | KsA research calibrated on German national + elite runners. Divergence from D1/D2 collegiate norms unknown until calibration phase. |
| Female 800m intra-race curve | **P2** | IAAF effort distribution research is male-dominant. Female 800m split baseline inferred from KsA sex differences + world record pacing analysis. Needs empirical validation. |
| Optimal decay λ for season history | **P2** | 21–28 day half-life is a reasonable starting point. Validate against in-season performance data once database reaches calibration phase. |
| Steeplechase split variance | **P2 — v2** | No published research on expected 400m lap variance due to barrier/water jump placement. Current approach: 3000m flat baseline with elevated variance tolerance. |
| Competitive position as SDS covariate | **P3 — future** | Lead/pack/chase dynamics materially affect split profiles. Excluded from v1 SDS. If position data becomes available from meet results, incorporate as covariate to reduce tactical-race false positives. |
| Indoor track baseline divergence | **P3 — v2** | 200m oval produces materially different split profiles. Separate baseline required. |

---

## 11. Key References

1. Blödorn, W. & Döring, F. (2025). Special endurance coefficients enable the evaluation of running performance. *Scientific Reports*, 15, 20184. https://doi.org/10.1038/s41598-025-06009-6
2. Blödorn, W. & Döring, F. (2025). Sex-specific characteristics of special endurance and performance potential in female runners. *BMC Research Notes*, 18, 196. https://doi.org/10.1186/s13104-025-07256-6
3. López-del Amo, J.L. et al. (2021). Effort distribution analysis for the 800m race: IAAF World Athletics Championships, London 2017 and Birmingham 2018.
4. Emerging Investigators (2022). An optimal pacing approach for track distance events. https://emerginginvestigators.org/articles/22-117
5. Daniels, J. & Gilbert, J. Oxygen Power — Performance Tables for Distance Runners.
6. World Athletics Scoring Tables (2025 revision). https://worldathletics.org/about-iaaf/documents/technical-information
7. Chen, J. Calculating World Athletics Scoring Table Coefficients. https://jeffchen.dev/posts/Calculating-World-Athletics-Coefficients/
8. Chen, J. Open-source parsed scoring table JSON. https://github.com/jchen1/iaaf-scoring-tables
9. Comparing and forecasting performances in different events of athletics. arXiv:1408.5924. https://arxiv.org/pdf/1408.5924

---

*Document version 2.0 — updated 2026-04-02. Supersedes v1.0 (2026-03-30).*
*For PACE development use. Next revision upon resolution of P0 altitude research item.*
