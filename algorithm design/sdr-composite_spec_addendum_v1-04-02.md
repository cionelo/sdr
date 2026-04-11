# PACE — SDR Composite Rating System: Spec Addendum
**Component:** Athlete Rating Algorithm — Composite Rating Architecture  
**Version:** 1.0  
**Date:** 2026-04-02  
**Status:** Pre-implementation spec addendum. Extends sdr-algo_SDS_methods_spec_v2.  
**Depends on:** SDS Methods Spec v2.0 (2026-04-02)

---

## 1. Purpose and Relationship to SDS Spec

The SDS Methods Spec defines one modular factor within the SDR composite: how well an athlete distributed effort within a single race. This addendum defines **everything else required to produce a usable SDR leaderboard**:

- The raw performance anchor (WA Performance Score)
- Competition Strength Index
- Confidence regression model
- Cross-distance grouping (coach-enabled)
- Race aggregation methods
- Decay weighting mechanics
- The full config schema (what coaches can adjust)
- Default presets and quick-access modifiers
- Data fields added at ingestion for future use

SDS remains defined in its own spec. This document defines the composite layer that consumes SDS alongside other modules and outputs a final SDR rating per athlete per distance.

---

## 2. SDR Output Structure

### 2.1 Atomic unit

SDR is computed **per athlete per distance**. A single athlete may have:
- A 1500m SDR
- A 5000m SDR
- A 10000m SDR

These are independent ratings. There is no automatic cross-distance composite. Cross-distance blending only occurs when a coach explicitly configures a distance group (see Section 8).

### 2.2 Output fields per athlete per distance

```
sdr_score,                    // composite rating (0–1400 scale, see Section 3)
sdr_confidence,               // "high" | "medium" | "low" | "provisional"
sdr_race_count,               // number of qualifying races in scope
sdr_aggregation_method,       // which method produced this score
sdr_preset,                   // which preset or "custom"
wa_performance_component,     // raw WA-based score before modifiers
sds_component,                // pacing quality contribution
csi_component,                // competition strength contribution
confidence_regression_applied // bool — was regression applied due to low race count
```

---

## 3. Module 1 — WA Performance Score (Primary Factor)

### 3.1 Role

The WA Performance Score is the backbone of SDR. It answers: **how fast did the athlete run, normalized to a cross-event comparable scale?** This is the single largest contributor to the composite rating.

### 3.2 Formula

WA scoring tables use a fitted power-law:
```
WA_points = a × (b − T)^c
```
Where `T` is finish time in seconds, and `a`, `b`, `c` are event-specific and sex-specific constants from the World Athletics 2022/2025 scoring tables.

**Implementation:** Use Jeff Chen's reverse-engineered coefficients (R² > 0.999 for all events). Source: https://github.com/jchen1/iaaf-scoring-tables

The WA points value is used directly as the raw performance component. No custom curve is applied in v1.

### 3.3 Collegiate rescaling (deferred)

WA scoring tables are calibrated against international competition. The point spread in the collegiate performance range (roughly 500–1100 WA points) may not have ideal resolution for distinguishing athletes who cluster in the D1/D2 sweet spot. If empirical analysis during calibration phase reveals insufficient discrimination in the collegiate range, a nonlinear rescaling function can be applied:

```
rescaled_score = f(wa_points)
```

Where `f` stretches the curve in the 650–1100 range. This is a future enhancement — v1 uses raw WA points.

### 3.4 Per-race WA score

Every race with a valid normalized finish time receives a WA points score. This is computed in Pass 3 (Athlete Profiling) and is already defined in the SDS spec for tier assignment. The same value is promoted to serve as the primary SDR component.

---

## 4. Module 2 — Competition Strength Index (CSI)

### 4.1 Role

A slight adjustment to account for field quality. A 14:15 5K against a field of 13:30–14:00 runners is a stronger indicator than a 14:15 in a field of 15:00+ runners. CSI is capped at ≤5% influence on the composite.

### 4.2 Formula

```
field_strength = mean WA points of top-5 finishers (excluding the athlete)
expected_field_strength = median field_strength for the athlete's tier at that distance
                          (bootstrapped from PACE database; tier median used as fallback
                          during cold start)

csi_raw = (field_strength − expected_field_strength) / expected_field_strength

csi_adjustment = clamp(csi_raw × csi_scaling_factor, −0.03, +0.03)
```

### 4.3 Parameters

| Parameter | Default | Range | Notes |
|---|---|---|---|
| `csi_scaling_factor` | 0.5 | 0.0–1.0 | Controls sensitivity. 0.5 means a field that's 10% stronger than expected yields a +5% raw adjustment before clamping |
| `csi_max_adjustment` | ±3% | ±0%–±5% | Hard cap on CSI influence |
| `csi_top_n` | 5 | 3–10 | Number of top finishers used to compute field strength |

### 4.4 Cold start behavior

Before PACE has sufficient data to compute tier-specific expected field strength, `expected_field_strength` defaults to the median WA points for the athlete's assigned tier (from the tier table in SDS spec Section 5.4). CSI adjustments during cold start will be noisier — `csi_confidence` flag surfaces this.

### 4.5 Fields written per race

```
csi_field_strength,
csi_expected_field_strength,
csi_adjustment,
csi_confidence: "empirical" | "tier_fallback"
```

---

## 5. Module 3 — Confidence Regression

### 5.1 Role

Athletes with fewer races have less reliable ratings. Confidence regression applies a mild Glicko-inspired pull toward the tier mean for athletes with low race counts, preventing a single-race outlier from dominating the leaderboard. The effect diminishes as races accumulate.

### 5.2 Mechanism

```
regression_target = tier_mean_wa_points   // mean WA points for the athlete's tier
                                           // at this distance, from PACE database
                                           // (or tier midpoint during cold start)

regression_factor:
  1 race:   0.15   // 15% pull toward tier mean
  2 races:  0.08   // 8% pull
  3+ races: 0.00   // no regression

regressed_score = raw_score − (regression_factor × (raw_score − regression_target))
```

### 5.3 Design rationale

- Regression is toward the **tier mean for the athlete's best performance**, not the population mean. A 980-point athlete regresses toward the A/S-tier mean (~1025), not the overall mean (~750). This keeps the regression mild and sensible.
- A single outstanding race still ranks well — a 1-race athlete with 980 points regresses to approximately 973 (with a tier mean of 1025), not dramatically lower.
- The regression factor of 0.15 is a starting estimate. Validate against backtesting data during calibration phase.

### 5.4 Visual confidence badge

Independent of the regression math, every SDR score displays a confidence badge:

| Race count | Badge | Label |
|---|---|---|
| 1 | ◔ | Provisional |
| 2 | ◑ | Limited |
| 3–4 | ◕ | Moderate |
| 5+ | ● | High |

Badge is always visible on the leaderboard regardless of preset or config.

### 5.5 Fields written

```
confidence_regression_applied: bool,
confidence_regression_factor: float,
confidence_regression_target: float,
sdr_confidence: "high" | "moderate" | "limited" | "provisional"
```

---

## 6. Tier-Scaled SDS Thresholds

### 6.1 Motivation

The SDS spec defines fixed directional asymmetry thresholds (e.g., +2.5% positive deviation triggers a fade penalty for 1500m–10K events). These thresholds assume elite-level pacing precision. Lower-tier athletes exhibit naturally higher lap-to-lap variance — an E-tier 5K runner going 2.5% fast on a single lap is noise, not a pacing error. Fixed thresholds over-penalize developmental runners.

### 6.2 Tier variance factor

SDS penalty and bonus thresholds are scaled by performance tier:

```
adjusted_threshold = base_threshold × (1 + tier_variance_factor)
```

| Tier | `tier_variance_factor` | Effective penalty threshold (1500m–10K) | Effective bonus threshold |
|---|---|---|---|
| S | 0.00 | 2.50% | −1.50% |
| A | 0.00 | 2.50% | −1.50% |
| B | 0.12 | 2.80% | −1.68% |
| C | 0.24 | 3.10% | −1.86% |
| D | 0.36 | 3.40% | −2.04% |
| E | 0.48 | 3.70% | −2.22% |

### 6.3 800m event

The 800m already uses KsA-based threshold widening in the SDS spec (anaerobic athletes get wider positive split tolerance). Tier-scaling is applied **in addition** to KsA widening:

```
800m_adjusted_threshold = base_800_threshold × (1 + tier_variance_factor) × (1 + ksa_widening_factor)
```

### 6.4 Validation plan

Tier variance factors are starting estimates. During calibration phase, compute actual per-tier lap-to-lap coefficient of variation from the PACE database and adjust factors to match observed distributions. Target: penalty triggers at approximately the 85th percentile of observed deviation per tier.

---

## 7. Race Aggregation Methods

### 7.1 Available methods

Coaches select one aggregation method per leaderboard view. The method determines how multiple race scores within the time scope are combined into a single SDR.

**Method 1 — PR-Only**
```
sdr = max(race_sdr_scores)
```
Selects the single best composite score from all qualifying races. Simplest method. Familiar to coaches. Does not account for consistency or recency.

**Method 2 — Best 2 of Last N**
```
qualifying_races = last N races in scope (default N = 6)
sdr = mean(top_2(race_sdr_scores from qualifying_races))
```
Balances recency with peak performance. Filters out bad days without requiring sustained consistency. The `N` window and `top_k` count are configurable in advanced settings.

| Parameter | Default | Range |
|---|---|---|
| `best_of_n_window` | 6 | 3–12 |
| `best_of_n_top_k` | 2 | 1–4 |

**Method 3 — Decay-Weighted Average**
```
weight_i = e^(−λ × days_since_race_i)
sdr = Σ(weight_i × race_sdr_i) / Σ(weight_i)
```
Most recent races dominate. Captures current form. Uses exponential decay.

| Parameter | Default by preset | Range |
|---|---|---|
| `decay_half_life_days` | 21 (Championship Seeding) / 60 (Season Strength) | 14–120 |

Decay half-life translates to λ:
```
λ = ln(2) / half_life_days
```

**Weight examples (21-day half-life):**

| Days since race | Weight |
|---|---|
| 0 (today) | 1.000 |
| 7 | 0.794 |
| 14 | 0.630 |
| 21 | 0.500 |
| 42 | 0.250 |
| 63 | 0.125 |

**Weight examples (60-day half-life):**

| Days since race | Weight |
|---|---|
| 0 | 1.000 |
| 14 | 0.891 |
| 30 | 0.707 |
| 60 | 0.500 |
| 90 | 0.354 |
| 120 | 0.250 |

### 7.2 Per-race composite score

Before aggregation, each individual race produces a composite score:
```
race_sdr = (wa_weight × wa_score)
         + (sds_weight × sds_normalized)
         + (csi_adjustment applied to wa_score)
```

SDS is normalized to the WA points scale for compositing:
```
sds_normalized = sds_score × sds_normalization_factor
```
Where `sds_normalization_factor` maps the SDS range to a contribution proportional to its configured weight. Implementation detail: the normalization factor is derived so that at default weights, a "perfect" SDS contributes the configured percentage of the total composite.

### 7.3 Default time scope

Current outdoor track season. Defined as: races with `date >= outdoor_season_start_date` for the current academic year. `outdoor_season_start_date` defaults to the first Saturday in March for the current year. Configurable in advanced settings for edge cases.

---

## 8. Cross-Distance Grouping (Coach-Enabled)

### 8.1 Default behavior

Distances are independent. A 5K SDR is computed from 5K races only. No cross-distance blending occurs unless explicitly configured.

### 8.2 Distance groups

When a coach enables a distance group, races from all distances in the group contribute to a single blended SDR. Suggested group templates:

| Group label | Distances |
|---|---|
| Mid-Distance | 800m, 1500m, Mile |
| Distance | 3000m, 3000m Steeple, 5000m |
| Long Distance | 5000m, 10000m |
| Full Range | 1500m, Mile, 3000m, 3000m Steeple, 5000m |
| Custom | Coach selects any combination |

### 8.3 Blending mechanism

When grouping is active, all races are converted to a common scale via WA points (which are already cross-distance comparable). Non-primary distances receive a confidence discount:

```
cross_distance_discount = 0.85   // configurable, 0.5–1.0

For each race not at the athlete's primary distance in the group:
  effective_wa_score = wa_score × cross_distance_discount
```

Primary distance is determined automatically: the distance with the most races in the current scope, or the distance with the highest WA score if race counts are equal.

SDS scores from non-primary distances are included at full value (pacing quality is distance-independent in principle), but `sds_confidence` may be lower if the athlete has limited race history at that distance.

### 8.4 Coach-facing note

Cross-distance grouping is inherently less precise than single-distance rating. The leaderboard should display a notice when grouping is active: *"Ratings include converted performances from multiple distances. Single-distance ratings are more precise."*

---

## 9. Composite Weighting

### 9.1 Default weights

| Factor | Default weight | Valid range | Notes |
|---|---|---|---|
| WA Performance Score | 75% | 50%–100% | Always included unless zeroed; cannot be toggled off in presets |
| SDS (Pacing Quality) | 15% | 0%–30% | Toggleable on/off via quick-access; 0% = time-only mode |
| Competition Strength Index | 5% | 0%–10% | Applied as adjustment to WA score, not independent axis |
| Cross-Distance Signal | 5% | 0%–15% | Only active when distance grouping is enabled; otherwise 0% |

Weights must sum to 100%. When a factor is toggled off, remaining weights are renormalized proportionally.

**Example — SDS toggled off (time-only mode):**
```
WA: 75 / (75 + 5) = 93.75% → rounds to 94%
CSI: 5 / (75 + 5) = 6.25% → rounds to 6%
SDS: 0%
Cross-Distance: 0% (not enabled)
```

### 9.2 Confidence regression

Confidence regression (Section 5) is applied as a post-composite modifier, not as a weighted factor. It adjusts the final score, not the weighting.

```
final_sdr = composite_sdr − (regression_factor × (composite_sdr − regression_target))
```

### 9.3 Score scale

SDR is expressed on the WA points scale (roughly 0–1400 for track events). This is intentional — coaches who are familiar with WA points or TFRRS will have immediate intuition for what the numbers mean. A 1000 SDR means approximately "1000 WA points worth of athlete, adjusted for pacing quality and field strength."

---

## 10. Default Presets

### 10.1 Preset: Championship Seeding

**Purpose:** Who is in the best form right now and most likely to perform at the upcoming championship meet?

| Setting | Value |
|---|---|
| Aggregation method | Decay-weighted average |
| Decay half-life | 21 days |
| WA weight | 75% |
| SDS weight | 15% |
| CSI weight | 5% |
| Cross-distance | Off |
| Confidence regression | On |
| Time scope | Current outdoor season |

### 10.2 Preset: Season Strength

**Purpose:** Who has been the strongest and most consistent athlete across the full season?

| Setting | Value |
|---|---|
| Aggregation method | Decay-weighted average |
| Decay half-life | 60 days |
| WA weight | 75% |
| SDS weight | 15% |
| CSI weight | 5% |
| Cross-distance | Off |
| Confidence regression | On |
| Time scope | Current outdoor season |

### 10.3 Preset: Raw Performance

**Purpose:** Traditional time-based seeding. No modifiers. The baseline coaches can compare other presets against.

| Setting | Value |
|---|---|
| Aggregation method | PR-only |
| Decay half-life | N/A |
| WA weight | 100% |
| SDS weight | 0% |
| CSI weight | 0% |
| Cross-distance | Off |
| Confidence regression | Off |
| Time scope | Current outdoor season |

### 10.4 Quick-access modifiers

Available on all presets without opening the full config panel:

| Modifier | Options | Default |
|---|---|---|
| Event selector | Single distance / distance group / all distances | Single distance |
| SDS toggle | On / Off | Per preset default |
| History mode | Season history (decay-weighted) / PR-only | Per preset default |

Changing a quick modifier from the preset default automatically switches the preset label to show modification (e.g., "Championship Seeding (modified)"). The full config panel shows all parameters for granular control.

---

## 11. Full Config Schema

This is the complete parameter space available to coaches in the advanced configuration panel. All parameters have defaults set by the active preset. Custom configurations can be saved as user presets (future paid feature).

### 11.1 Scope parameters

| Parameter | Type | Default | Options / Range |
|---|---|---|---|
| `time_scope` | enum | `current_outdoor` | `current_outdoor`, `current_indoor`, `current_academic_year`, `custom_date_range` |
| `event_filter` | enum[] | single distance selected | Any combination of: 800m, 1500m, Mile, 3000m, 3000m Steeple, 5000m, 10000m |
| `distance_grouping` | bool | false | If true, selected events are blended into one rating |
| `sex_filter` | enum | per leaderboard | `male`, `female` |

### 11.2 Aggregation parameters

| Parameter | Type | Default | Range |
|---|---|---|---|
| `aggregation_method` | enum | per preset | `pr_only`, `best_of_n`, `decay_weighted` |
| `decay_half_life_days` | int | per preset | 14–120 |
| `best_of_n_window` | int | 6 | 3–12 |
| `best_of_n_top_k` | int | 2 | 1–4 |

### 11.3 Weight parameters

| Parameter | Type | Default | Range |
|---|---|---|---|
| `wa_weight` | float | 0.75 | 0.50–1.00 |
| `sds_weight` | float | 0.15 | 0.00–0.30 |
| `csi_weight` | float | 0.05 | 0.00–0.10 |
| `cross_distance_weight` | float | 0.05 | 0.00–0.15 |

Weights are renormalized to sum to 1.0 after any toggle changes.

### 11.4 Module-specific parameters

| Parameter | Type | Default | Range | Module |
|---|---|---|---|---|
| `csi_top_n` | int | 5 | 3–10 | CSI |
| `csi_max_adjustment` | float | 0.03 | 0.00–0.05 | CSI |
| `cross_distance_discount` | float | 0.85 | 0.50–1.00 | Cross-Distance |
| `confidence_regression_enabled` | bool | true | — | Regression |

### 11.5 Preset management

```
preset_id,
preset_name,
preset_type: "system_default" | "user_saved",
config: { ...all parameters above },
created_at,
updated_at,
user_id          // null for system defaults
```

System default presets are read-only. User-saved presets are stored per coach account. Future paid feature: sharing presets between coaches.

---

## 12. Ingestion Additions

### 12.1 Race-type context flag (ingest now, use later)

Added to Pass 1 ingestion. Not consumed by any v1 algorithm pass, but stored for future use in contextual adjustments.

```
race_type: "invitational" | "championship" | "conference_championship" | "heat" | "time_trial" | "unknown"
```

Classification heuristic at ingestion:
- Meet name contains "championship", "conference", "NCAA" → `championship` or `conference_championship`
- Meet name contains "invitational", "open", "classic" → `invitational`
- Event marked as heat/prelim in source data → `heat`
- Time trial flagged in source → `time_trial`
- Otherwise → `unknown`

### 12.2 Weather data (future — not ingested in v1)

Flagged for future enhancement. When implemented:
```
race_temperature_f,
race_humidity_pct,
race_wind_speed_mph,
weather_source,
weather_adjustment_applied: bool
```

Data source: weather API lookup by venue coordinates + race date/time.

---

## 13. Validation Strategy

### 13.1 Backtesting methodology

The ultimate test of SDR accuracy: does it predict finishing order at championship meets better than raw seed time alone?

**Procedure:**
1. Select a set of past championship meets where full split data is available (conference championships, regionals, NCAA championships)
2. For each meet, compute SDR for all entered athletes using only data available **before** that meet
3. Compare SDR-predicted finishing order vs. actual finishing order
4. Compare prediction accuracy of SDR vs. raw PR seeding vs. TFRRS-style time-only ranking

**Metrics:**
- Kendall's tau (rank correlation between predicted and actual order)
- Top-N accuracy (% of actual top-5/top-10 correctly identified)
- Mean absolute position error

**Baseline:** If SDR does not outperform raw PR seeding on these metrics, the additional complexity of SDS, CSI, and other modules is not justified. The system must demonstrably add predictive value.

### 13.2 Per-module contribution analysis

Test each module's marginal contribution by running backtests with individual modules toggled on/off:
- WA only (baseline)
- WA + SDS
- WA + SDS + CSI
- WA + SDS + CSI + confidence regression

This quantifies whether each module is adding signal or noise, and informs default weight calibration.

---

## 14. Open Research Items (Addendum-Specific)

| Area | Priority | Notes |
|---|---|---|
| Tier variance factors for SDS thresholds | **P1** | Starting estimates (0.00–0.48 by tier). Validate against observed lap-to-lap CV once database reaches calibration phase. Target: penalty triggers at ~85th percentile of observed deviation per tier. |
| Confidence regression factor calibration | **P1** | 0.15 / 0.08 / 0.00 for 1/2/3+ races are starting estimates. Backtest to determine if regression improves or degrades prediction accuracy. |
| Optimal decay half-life per preset | **P2** | 21 days (Championship) and 60 days (Season Strength) are starting estimates. Validate against in-season championship prediction accuracy. |
| CSI expected field strength baselines | **P2** | Requires sufficient PACE data to compute per-tier median field strength. Tier midpoint fallback used during cold start. |
| Collegiate WA rescaling | **P3 — future** | Assess whether WA point spread is sufficient in the 650–1100 range for collegiate discrimination. Only pursue if backtesting reveals clustering issues. |
| Weather normalization | **P3 — future** | Quantifiable impact. Requires weather API integration and distance-event correction models. Flagged for v2+. |
| Race-type contextual adjustment | **P3 — future** | Data ingested in v1 but not consumed. Future module could adjust expectations for championship tactical races vs. fast invitationals. |

---

## 15. Factors Explicitly Excluded from SDR

| Factor | Reason for exclusion |
|---|---|
| Pack movement / position change | Signal-to-noise ratio too low for a rating system. Field-dependent, tactically confounded, and split data not reliably captured across timing providers. Remains available in PACE visualization for race analysis but does not feed SDR. |
| Lead time bonus | Subset of pack movement — same exclusion rationale. |
| Season trajectory (improvement/decline) | Predictive rather than descriptive. SDR reflects what happened, not what might happen. Coaches can infer trajectory from the leaderboard history. |
| Head-to-head results | Implicitly captured by raw times. In running, the "strength of the thing you did" is directly measurable via the clock, unlike chess where outcome is the only signal. Adding head-to-head would add complexity without meaningful accuracy gain. |

---

## 16. Implementation Sequence

Recommended build order, respecting the dependency chain in the SDS spec:

1. **Pass 2 — Altitude Normalization** (P0 research dependency: resolve conversion method first)
2. **Pass 3 — Athlete Profiling** (KsA + tier assignment + WA Performance Score)
3. **Pass 4 — SDS Calculation** (with tier-scaled thresholds from Section 6)
4. **Pass 5a — Per-Race Composite** (WA + SDS + CSI per race)
5. **Pass 5b — Aggregation** (apply selected method: PR-only, best-of-N, or decay-weighted)
6. **Pass 5c — Confidence Regression** (apply post-aggregation adjustment)
7. **Config layer** — build with hardcoded defaults first, then add preset selection, then quick-access modifiers, then full advanced config panel
8. **Backtesting harness** — validate against past championship results before launch
9. **Cross-distance grouping** — add after single-distance SDR is validated

---

*Document version 1.0 — 2026-04-02.*  
*Addendum to SDS Methods Spec v2.0. For PACE development use.*  
*Next revision upon resolution of P0 altitude research item and initial backtesting results.*
