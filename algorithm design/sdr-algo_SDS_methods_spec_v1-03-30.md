# PACE — Split Deviation Score (SDS) Methodology
**Component:** Athlete Rating Algorithm — Split Distribution Module
**Version:** 1.0 draft
**Date:** 2026-03-30
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

## 2. Data Sources and Quality Requirements

### 2.1 Accepted meet sources
- live.directathletics
- Hy-Tek / Flash Results hosted meet results
- Any FAT-timed outdoor meet with verified 400m lap splits

### 2.2 Split quality requirements
- Full 400m lap splits required for all events
- FAT timing only — hand timing disqualifies a race from SDS calculation
- Missing or incomplete splits: race is ingested to athlete profile but SDS is flagged null with reason code
- No cross-country or road race data for SDS (finish time and PR data only from those sources)

### 2.3 Data quality flag
Every ingested race carries a `data_quality` field:
```
data_quality: "verified_fat" | "incomplete_splits" | "missing_splits" | "excluded"
```
SDS is only calculated on `verified_fat` races.

---

## 3. Athlete Profile and KsA Fitness Context

### 3.1 What KsA is
The Coefficient of Special Endurance (KsA) quantifies relative pace loss between adjacent race distances. It is defined as:

```
KsA = pace_shorter_distance / pace_longer_distance
```

A higher KsA (closer to 1.0) means less pace loss between distances — indicative of stronger aerobic endurance relative to raw speed. A lower KsA indicates more anaerobic/speed-dominant profile.

### 3.2 Research foundation
- **Male baselines:** Blödorn & Döring (2025), *Scientific Reports* — 14,000+ race times, German national male runners 1980–2022, validated across international to regional levels
- **Female baselines:** Blödorn & Döring (2025), *BMC Research Notes* — 20,000+ race times, same methodology applied to female runners. Key finding: females show more pronounced pace loss from 100m–1500m than males, converging at 5000m+. Sex-specific tables required for 800m and 1500m baselines.
- **Intra-race pacing model:** Emerging Investigators (2022), biomechanical simulation of Tokyo 2020 Olympic 800m and 1500m — validated surge-even-kick curve for 1500m+; positive split model for 800m confirmed by IAAF effort distribution research (López-del Amo et al., 2021)

### 3.3 Reference KsA values (median, research-derived)

| Distance pair | Male KsA | Female KsA |
|---|---|---|
| 400m/800m | 0.888 | 0.880 |
| 800m/1500m | 0.921 | 0.915 |
| 1500m/3000m | 0.923 | 0.926 |
| 3000m/5000m | 0.967 | 0.963 |
| 5000m/10000m | 0.954 | 0.956 |

Note: research baselines are calibrated on German national and elite runners. Empirical recalibration against collegiate-specific data is planned (see Section 8).

### 3.4 Athlete KsA profiling
At ingestion, PACE computes an athlete's personal KsA values wherever adjacent-distance PRs exist:

```
athlete_ksa_800_1500  = athlete_pace_800 / athlete_pace_1500
athlete_ksa_1500_5000 = athlete_pace_1500 / athlete_pace_5000
```

This establishes metabolic archetype:
- **Anaerobic-dominant** (low 800/1500 KsA, high speed): expected to positive split; larger positive split tolerance in SDS
- **Aerobic-dominant** (high KsA across board): expected to run even/negative; lower positive split tolerance
- **Hybrid**: intermediate thresholds

### 3.5 KsA confidence flag
```
ksa_confidence: "full"       // PRs at 3+ adjacent distances, all within current season
              | "partial"    // PRs at 2 adjacent distances or stale (prior season)
              | "minimal"    // single distance only, falls back to tier baseline
              | "none"       // no PR data, uses generic tier + sex baseline only
```
KsA confidence propagates into overall SDS confidence. A `minimal` or `none` KsA confidence produces a lower-confidence SDS regardless of split data quality.

---

## 4. Performance Tier Bucketing

### 4.1 Rationale
KsA pace loss coefficients and intra-race split profiles are stable within performance tiers but shift meaningfully across them. Pooling all collegiate performances into a single baseline would absorb fitness heterogeneity as noise, degrading SDS accuracy. Tier bucketing ensures an athlete is scored against peers at a comparable physiological intensity.

### 4.2 Tier framework
Tiers are defined using **World Athletics Scoring Tables (2022 revision)** as the primary anchor. This is the most rigorously validated, sex-specific, distance-normalized performance scoring system available and eliminates the need to set arbitrary time cutoffs per event.

> ⚠️ **Research note:** PACE should implement the 2022 World Athletics scoring tables directly. Time-based bucket cutoffs (e.g. sub-14:30 5K) are provided below only as human-readable approximations for documentation. The actual tier assignment in code should derive from WA points to ensure cross-distance consistency.

Approximate tier breakpoints (male, outdoor track):

| Tier | WA Points (approx) | 800m | 1500m | 5000m | 10000m |
|---|---|---|---|---|---|
| Elite | 1100+ | sub-1:46 | sub-3:36 | sub-13:20 | sub-27:40 |
| National competitive | 950–1100 | 1:46–1:52 | 3:36–3:50 | 13:20–14:10 | 27:40–29:15 |
| Collegiate competitive | 800–950 | 1:52–2:00 | 3:50–4:05 | 14:10–15:10 | 29:15–31:30 |
| Developmental | below 800 | 2:00+ | 4:05+ | 15:10+ | 31:30+ |

Female tiers use sex-specific WA scoring table values. D1/D2/D3/NAIA division is not used for tier assignment — WA points are the direct classifier.

### 4.3 Tier and SDS confidence
D3/NAIA athletes are not the primary target audience but will appear in ingested meet data. Their SDS is calculated normally but a `tier_confidence` flag notes when an athlete's tier assignment is based on limited data:
```
tier_confidence: "confirmed"  // WA points from 2+ races this season
               | "estimated"  // WA points from single race or prior season PR
               | "low"        // insufficient data, tier assigned from seed time only
```

---

## 5. Baseline Split Distribution Curves

### 5.1 How baselines are generated
For a given athlete, event, and finish time, PACE generates their expected lap-by-lap split distribution using:

1. **KsA archetype** → selects the appropriate pace decay curve shape
2. **Performance tier** → sets the tier-appropriate scaling
3. **Sex** → applies sex-specific KsA values for 800m and 1500m
4. **Finish time** → scales the curve to produce absolute expected split times

This means every SDS calculation has a *personalized* baseline, not a generic one. A 1:52 800m runner with a 800/1500 KsA of 0.900 has a different expected split curve than a 1:52 runner with a KsA of 0.935.

### 5.2 Expected curve shapes by event

**800m**
- Baseline: positive split (~51.3% / 48.7% lap 1 / lap 2, male)
- Female baseline: slightly more positive (~51.8% / 48.2%) reflecting lower anaerobic KsA
- Physiological basis: 800m is classified as an extended sprint; anaerobic energy reserves are near-maximal in lap 1; positive split is biomechanically optimal
- Tolerance window: ±3% from baseline before penalty/reward triggers

**1500m / Mile**
- Baseline: surge-even-kick (first 300m slightly elevated, middle even, final 300m kick)
- Approximate 400m lap distribution: 26.5% / 26.0% / 25.8% / 21.7% (last 300m proportional)
- Even to slight negative overall is performance-optimal

**3000m / Steeplechase**
- Baseline: even to slight negative
- Steeplechase note: water jump and barrier distribution on specific laps introduces legitimate split variance that is not a pacing artifact. Steeple SDS uses same framework but with higher lap-level variance tolerance. Steeple-specific terrain modeling (barrier frequency per lap) flagged for v2 development.

**5000m**
- Baseline: even with controlled opening km and accelerating final km
- Approximate 1km split distribution: 20.4% / 20.2% / 20.0% / 19.8% / 19.6%
- Strong closing velocity index (CVI) is a positive fitness signal

**10000m**
- Baseline: even to slight negative; larger mid-race variance tolerance than 5K
- Approximate 2km split distribution: relatively flat with 3–4% acceleration in final 2km

### 5.3 Reverse engineering from finish time
Given only a finish time and KsA profile, PACE can generate the full expected split ladder before observing actual splits:
```
finish_time + ksa_archetype → baseline_curve → per-lap expected splits
```
This enables SDS calculation for first-time ingested athletes with no prior split history, using their finish time and any available adjacent-distance PRs.

---

## 6. SDS Calculation

### 6.1 Raw deviation
```
raw_deviation_lap_n = actual_split_pct_n - baseline_split_pct_n
```
Signed. Positive = went out faster than baseline. Negative = more conservative than baseline.

### 6.2 Directional asymmetry by event

**800m**
```
deviation > +0.03  → penalty (overcooked opening lap)
deviation < -0.02  → mild flag (unusually conservative; may indicate tactical race or undertaper)
-0.02 to +0.03     → neutral to slight positive
```
Penalty threshold widens for athletes with higher anaerobic KsA (true 800m specialists tolerate more positive split).

**1500m–10000m**
```
deviation > +0.025 → penalty (positive split fade)
deviation < -0.015 → bonus (controlled open, fitness above finish time)
closing_velocity_index (CVI) = last_lap_pace / avg_lap_pace
CVI > 1.02         → additional bonus (genuine kick signal)
```

### 6.3 Implied fitness ceiling
When an athlete's opening splits project a faster finish time than their actual finish:
```
implied_fitness_time = extrapolate_to_full_distance(first_half_pace)
execution_delta = implied_fitness_time - actual_finish_time
```
A negative execution_delta (implied faster than actual) is a fitness-above-finish-time signal. This feeds an `execution_delta_adjustment` bonus in the composite SDS. As the empirical database grows, execution_delta is normalized by event, tier, and season phase.

### 6.4 Composite SDS formula
```
SDS = base_time_score
    + (ksa_archetype_weight × deviation_score)
    + closing_velocity_bonus
    - fade_penalty
    + execution_delta_adjustment
```

Where:
- `ksa_archetype_weight` scales penalty/reward based on athlete's metabolic profile
- All components are bounded to prevent any single factor from dominating
- SDS is calculated per race and stored; not averaged automatically

### 6.5 SDS confidence output
Every SDS result carries:
```
sds_confidence:   "high" | "medium" | "low" | "insufficient"
ksa_confidence:   "full" | "partial" | "minimal" | "none"
split_confidence: "verified_fat" | "incomplete" | "null"
baseline_source:  "empirical_calibrated" | "empirical_bootstrap" | "theoretical"
tier_confidence:  "confirmed" | "estimated" | "low"
```
These are surfaced in the coach-facing UI and feed into how the SDS is weighted in composite SDR calculations.

---

## 7. Season History Integration

### 7.1 Multi-race SDS aggregation
SDS is calculated for every eligible race. Aggregation across a season uses **exponential decay weighting**, not straight averaging:

```
weight_n = e^(-λ × days_since_race)
```

Recommended starting λ: decay half-life of ~21–28 days during competitive season. This means a race from 8 weeks ago carries roughly 10–15% of the weight of last week's race.

### 7.2 Volume benefit
More races = more data = higher confidence, not simply a better score. Volume benefit is expressed through:
- Tighter confidence intervals on SDS estimates
- Reduced regression-to-mean in aggregated scores
- Ability to detect consistency signal (low variance across races = strength indicator)

Racing consistency (low SDS variance across a season) is treated as an independent positive signal. An athlete with 6 races showing similar SDS scores is more confidently rated than one with 2 races, regardless of whether those 6 scores are individually higher.

### 7.3 Fatigue modeling
Race frequency within a rolling 21-day window is captured as a covariate. Systematic positive split drift over a congested schedule is flagged as potential fatigue artifact rather than scored as a pacing deficit. This does not adjust SDS directly but informs the `season_history_rating` module and flags for coach review.

### 7.4 Season history as optional SDR input
Coaches can include or exclude season history rating in their composite SDR configuration. When included, the decay-weighted SDS aggregate feeds into SDR alongside single-race SDS values. Athletes with more races benefit from higher confidence scores, not inflated raw ratings.

---

## 8. Self-Improving Empirical Baseline

### 8.1 Bootstrap phase (launch → ~30 major meets ingested)
- Baseline curves derived from KsA research values and Tokyo pacing model
- `baseline_source` flag: `"theoretical"`
- SDS scores are valid but calibrated against elite/national-level research baselines
- Coaches should be informed scores reflect theoretical priors during this phase

### 8.2 Calibration phase (30–150 meets)
- Empirical baselines computed from PACE's own database, stratified by event, tier, and sex
- Divergence from theoretical baselines measured and logged
- `baseline_source` flag transitions to `"empirical_bootstrap"`
- Expected finding: collegiate D2/D3 baselines will differ from elite-calibrated research values, particularly at developmental tier

### 8.3 Mature phase (150+ meets, ongoing)
- PACE's empirical database becomes primary baseline source
- KsA research values used for validation and outlier detection, not primary input
- `baseline_source` flag: `"empirical_calibrated"`
- Baselines recalibrated on a rolling basis as new meets are ingested

### 8.4 Cold start communication
During bootstrap and calibration phases, PACE surfaces `baseline_source` prominently in coach-facing outputs. This prevents coaches from over-interpreting early SDS scores as equivalent to mature empirical scores, and protects trust as the system improves.

---

## 9. Architecture Notes for Implementation

### 9.1 Modularity
SDS is one module. It does not absorb tactical racing context, fatigue state, or competitive position dynamics — those are separate low-weight factors in the SDR composite. Keeping SDS clean to pacing/fitness signal preserves diagnostic value: a coach can distinguish poor pacing from poor tactics from poor form.

### 9.2 Coach-configurable weighting
SDR is explicitly a build-your-own rating. Coaches configure which factors matter for their seeding use case. SDS can be:
- Applied per-race (view the SDS for any single race)
- Applied to an athlete's PR at a specific distance
- Applied as a decay-weighted season aggregate
- Excluded entirely if coach prefers time-only seeding

### 9.3 Data model minimum fields per race
```
athlete_id, event, finish_time, date, meet_id, meet_source,
splits: [lap_1, lap_2, ...lap_n],  // 400m intervals
data_quality, timing_method,
sds_score, sds_confidence, ksa_confidence,
split_confidence, baseline_source, tier_confidence,
implied_fitness_time, execution_delta, closing_velocity_index
```

### 9.4 Steeple note
3000m Steeplechase is ingested and rated using the 3000m flat baseline as a starting point. Water jump laps are flagged. Steeple-specific barrier distribution modeling is deferred to v2 — the current approach will produce valid SDS scores with slightly elevated variance tolerance.

---

## 10. Open Research Questions

The following areas require additional baseline research or empirical validation before implementation decisions are finalized:

| Area | Status | Notes |
|---|---|---|
| Collegiate-specific KsA values | ⚠️ Gap | KsA research is calibrated on German national + elite runners. Divergence from D1/D2 collegiate norms is unknown until empirical calibration phase. |
| Female 800m intra-race curve | ⚠️ Partial | IAAF effort distribution research (López-del Amo) is male-dominant. Female 800m split baseline is inferred from KsA sex differences + world record pacing analysis. Needs validation. |
| Steeplechase split variance | ⚠️ Deferred | No published research on expected 400m lap variance due to barrier/water jump placement. V2 item. |
| Optimal decay λ for season history | ⚠️ TBD | 21–28 day half-life is a reasonable starting point but should be validated against actual in-season performance data once database reaches calibration phase. |
| Competitive position as SDS covariate | ⚠️ Future | Position data (lead/pack/chase) meaningfully affects split profiles. Currently excluded from SDS. If position data becomes systematically available via meet results, this should be incorporated as a covariate to reduce tactical race false-positives. |
| Indoor track baseline divergence | ⚠️ Deferred | Indoor 200m oval produces materially different split profiles. Separate baseline required. V2. |

---

## 11. Key References

1. Blödorn, W. & Döring, F. (2025). Special endurance coefficients enable the evaluation of running performance. *Scientific Reports*, 15, 20184. https://doi.org/10.1038/s41598-025-06009-6
2. Blödorn, W. & Döring, F. (2025). Sex-specific characteristics of special endurance and performance potential in female runners. *BMC Research Notes*, 18, 196. https://doi.org/10.1186/s13104-025-07256-6
3. López-del Amo, J.L. et al. (2021). Effort distribution analysis for the 800m race: IAAF World Athletics Championships, London 2017 and Birmingham 2018. *ResearchGate*.
4. Emerging Investigators (2022). An optimal pacing approach for track distance events. https://emerginginvestigators.org/articles/22-117
5. Daniels, J. & Gilbert, J. Oxygen Power — Performance Tables for Distance Runners. (VDOT model reference for cross-distance fitness context.)
6. World Athletics Scoring Tables (2022 revision). https://worldathletics.org/records/toplists

---

*Document generated: 2026-03-30. For PACE development use. Next revision upon empirical calibration phase initiation.*
