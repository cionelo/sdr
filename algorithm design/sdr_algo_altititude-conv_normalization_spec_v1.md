# PACE — Performance Normalization Spec
**Component:** Altitude + Facility + Event Conversion Pipeline  
**Version:** 1.0  
**Date:** 2026-04-04  
**Status:** Implementation-ready spec. Resolves P0 altitude research dependency.  
**Depends on:** SDR Composite Spec Addendum v1.0 (2026-04-02), SDS Methods Spec v2.0 (2026-04-02)  
**Audience:** AI developer implementing the SDR pipeline in Supabase

---

## 1. Purpose and Scope

This spec defines **Pass 2 — Performance Normalization**, the pipeline stage that converts every raw finish time to a sea-level-equivalent, outdoor-standard-track time before any SDR calculations occur. It resolves the P0 altitude research dependency flagged in the SDR Composite Spec Addendum (Section 14) and the SDS Methods Spec (Pass 2 placeholder).

### 1.1 Why This Matters for SDR

A 14:30 5K at Adams State (7,544 ft) is a fundamentally different performance than a 14:30 at sea level. Without normalization, altitude-venue athletes are systematically underrated by WA Performance Score, SDS thresholds are miscalibrated, and the CSI field-strength calculation compares apples to oranges. Normalization must run **before** any downstream calculation — WA scoring, KsA profiling, tier assignment, SDS, and CSI all consume the normalized time.

### 1.2 Conversion Layers

The TFRRS Mark Converter applies up to three independent conversion layers. PACE v1 needs only a subset of these. Each layer is defined independently and applied in a fixed order:

| Layer | What It Does | PACE v1 Scope | Priority |
|---|---|---|---|
| **Altitude Adjustment** | Converts times at ≥3,000 ft to sea-level equivalent | **In scope** — critical for outdoor distance events | P0 |
| **Event Conversion** | Converts between related distances (Mile ↔ 1500m, 55m ↔ 60m) | **In scope** — needed for Mile ↔ 1500m only | P1 |
| **Indoor Facility Indexing** | Converts between flat/banked/undersized indoor tracks | **Out of scope** — PACE v1 is outdoor-only | Future |

### 1.3 Pipeline Position

```
Pass 1: Ingestion (scrape, normalize, load raw data to Supabase)
    ↓
Pass 2: PERFORMANCE NORMALIZATION ← this spec
    ├── 2a: Altitude adjustment (venue elevation → sea-level time)
    ├── 2b: Event conversion (Mile → 1500m equivalent where needed)
    └── 2c: Store both raw and normalized times
    ↓
Pass 3: Athlete Profiling (KsA, tier assignment, WA score — all using normalized times)
    ↓
Pass 4+: SDS, CSI, Composite SDR
```

**Critical constraint:** Every downstream pass consumes `normalized_time_sec`, never `raw_time_sec`. The raw time is preserved for display, auditing, and future recalculation.

---

## 2. Altitude Adjustment — Model Architecture

### 2.1 NCAA Altitude Conversion Background

The NCAA adopted the IAAF's 3,000-foot threshold in the 1980s after research confirmed altitude creates two opposing effects on track performance. For short/explosive events (≤400m), reduced air resistance at altitude *helps* — the NCAA *adds* time to penalize this advantage. For distance events (≥800m), reduced oxygen availability *hurts* — the NCAA *subtracts* time to credit athletes for the altitude handicap. The crossover point is approximately 600m race distance.

There are currently **38 designated NCAA altitude venues** at ≥3,000 feet, concentrated in Colorado, Wyoming, Arizona, New Mexico, Utah, Montana, Idaho, Texas (west), Nebraska, and South Dakota.

**Key finding from reverse-engineering the TFRRS converter:** The altitude adjustment for distance events is implemented as a **percentage of finish time**, with the percentage determined by a function of both **venue altitude** and **event distance**. The TFRRS converter is entirely server-side — no client-side JavaScript exposes the formula. However, the NCAA has published exact conversion tables for specific venues that allow us to recover the underlying model.

### 2.2 The Altitude Model

For PACE v1 distance events (800m through 10,000m), the altitude adjustment follows:

```
adjusted_time = raw_time × (1 − adjustment_pct)
```

Where `adjustment_pct` is a positive value (subtracting time = crediting the athlete).

`adjustment_pct` is a function of two variables:
- **Venue elevation** (feet above sea level)
- **Event aerobic fraction** (how aerobically demanding the event is)

### 2.3 Verified Data Points

These data points are extracted from official NCAA conversion tables published by the University of New Mexico Athletic Department (compiled by Dr. Richard J. Ceronie) for the Albuquerque Convention Center venue at 4,958 feet:

**800m at Albuquerque (4,958 ft):**

| Actual Time | NCAA Adjusted | Delta | Adjustment % |
|---|---|---|---|
| 1:47.00 (107.00s) | 1:46.40 (106.40s) | −0.60s | 0.561% |
| 1:50.00 (110.00s) | 1:49.39 (109.39s) | −0.61s | 0.555% |
| 1:54.00 (114.00s) | 1:53.36 (113.36s) | −0.64s | 0.561% |
| 2:00.00 (120.00s) | 1:59.33 (119.33s) | −0.67s | 0.558% |
| 2:06.00 (126.00s) | 2:05.30 (125.30s) | −0.70s | 0.556% |
| 2:14.00 (134.00s) | 2:13.25 (133.25s) | −0.75s | 0.560% |

**Finding:** The adjustment percentage for 800m at ABQ is **constant at ≈0.558%** across the entire collegiate performance range. The percentage does not vary meaningfully with finish time. This confirms a simple multiplicative model: `adjusted = raw × (1 − pct)`.

**Sprint events at Albuquerque (4,958 ft) — for reference only (out of PACE v1 scope):**

| Event | Adjustment | Direction |
|---|---|---|
| 60m | +0.02s | Added (penalizes altitude air-resistance benefit) |
| 200m | +0.07s | Added |
| 400m | +0.11s | Added |
| 4×400m | +0.44s | Added (= 4 × 0.11) |

**Cross-altitude comparison for the Mile:**

| Venue | Altitude | Mile Adjustment | Adjustment % |
|---|---|---|---|
| Texas Tech (Lubbock, TX) | 3,195 ft | −3.46s on 5:00 | 1.153% |
| Albuquerque Convention Center | 4,958 ft | ~5.6s on 5:00 (estimated) | ~1.86% |
| Adams State (Alamosa, CO) | 7,544 ft | −12.65s on 5:00 | 4.217% |

**Critical observation:** The adjustment percentage for the Mile is **much larger** than for the 800m at the same altitude (1.86% vs 0.558% at ABQ). This is physiologically correct — longer events have higher aerobic contribution, so altitude's O₂ reduction effect scales with event duration.

### 2.4 Model Specification: Per-Venue, Per-Event Percentage Table

Given the findings above, the altitude adjustment model for PACE is a **lookup table** keyed by `(venue_id, event_distance)`, returning a single `adjustment_pct` value.

```
Table: altitude_adjustments
─────────────────────────────────────────────────
venue_id        TEXT     FK → venues.id
event_distance  TEXT     "800m" | "1500m" | "mile" | "3000m_steeple" | "5000m" | "10000m"
adjustment_pct  FLOAT   e.g., 0.00558 for 800m at ABQ
source          TEXT     "ncaa_published" | "tfrrs_sampled" | "model_interpolated"
confidence      TEXT     "verified" | "estimated"
─────────────────────────────────────────────────
```

**Why a lookup table, not a formula?**

1. The NCAA itself uses per-venue lookup tables, not a universal formula. Their own documentation acknowledges the downloadable converter and the TFRRS converter produce different results by ±0.01s.
2. The relationship between altitude and adjustment is **nonlinear** — the percentage at 7,544 ft is not simply proportional to 3,195 ft. A two-point model (Texas Tech + Adams State) yields a quadratic, but we have insufficient data to validate it across all 38 venues.
3. A lookup table is self-documenting, auditable, and easy to update when better data becomes available.
4. The alternative (deriving a closed-form altitude × event formula) requires sampling all 38 venues across all events — the lookup table approach can be populated incrementally.

### 2.5 Populating the Lookup Table

**Phase 1 — Verified values (implement immediately):**

Populate from the published UNM conversion tables for Albuquerque (4,958 ft). We have exact 800m values. The mile values can be extracted from the same document (which covers 800m, Mile, 3000m, 5000m, and DMR conversion charts).

**Phase 2 — Sampled values (pre-launch requirement):**

For each of the 38 altitude venues, submit a controlled set of marks through the TFRRS converter at `tfrrs.org/conversion` and record the output. **Strategy:**

For each venue × event combination:
1. Submit **3 marks** spanning the collegiate range (e.g., 1:50, 2:00, 2:10 for 800m)
2. Compute the adjustment percentage from each
3. Verify they're constant (they should be, per our ABQ analysis)
4. Store the mean as `adjustment_pct` with `source = "tfrrs_sampled"`

**Total samples needed:** 38 venues × 6 events × 3 marks = **684 form submissions**. This can be scripted with a simple HTTP POST client in ~2 hours, but note TFRRS TOS prohibits automated scraping. The published NCAA tables for other venues (available at individual university athletic department websites) should be used wherever possible.

**Phase 3 — Model interpolation (future fallback):**

For any venue not in the TFRRS dropdown (e.g., a new altitude facility), fit a parametric model from the sampled data:

```
adjustment_pct = f(altitude_ft, event_aerobic_fraction)
```

Where `event_aerobic_fraction` is a known constant per event from exercise physiology:

| Event | Approximate Aerobic Fraction |
|---|---|
| 800m | 0.60 |
| 1500m | 0.80 |
| Mile | 0.82 |
| 3000m / Steeple | 0.90 |
| 5000m | 0.95 |
| 10000m | 0.98 |

The model form is likely:

```
adjustment_pct = α × aerobic_fraction × g(altitude)
```

Where `g(altitude)` is a function of feet above sea level with threshold at 3,000 ft. Candidate forms to fit against sampled data:

- **Linear:** `g(h) = β × (h − 3000)` for h ≥ 3000, else 0
- **Power-law:** `g(h) = β × (h − 3000)^γ` 
- **Exponential barometric:** `g(h) = 1 − e^(−β × h / scale_height)`

The barometric model has the strongest physiological basis (atmospheric pressure follows an exponential decay), but all three are adequate over the 3,000–8,000 ft range of NCAA venues. Fit using `scipy.optimize.curve_fit` against the Phase 2 sampled data.

**For v1 launch:** The lookup table from Phase 2 sampling is sufficient. The parametric model is a fallback for edge cases and future venues only.

---

## 3. Altitude Venue Database

### 3.1 Schema

```sql
CREATE TABLE venues (
    id              TEXT PRIMARY KEY,       -- slugified venue name
    name            TEXT NOT NULL,          -- display name
    city            TEXT,
    state           TEXT,
    elevation_ft    INT NOT NULL,
    is_altitude     BOOLEAN GENERATED ALWAYS AS (elevation_ft >= 3000) STORED,
    track_surface   TEXT DEFAULT 'outdoor', -- "outdoor" | "indoor_flat" | "indoor_banked" | "indoor_oversized"
    tfrrs_venue_key TEXT,                   -- exact string from TFRRS venue dropdown
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Known NCAA Altitude Venues (≥3,000 ft)

This is the working list of outdoor track venues that trigger altitude adjustment. Cross-referenced from the TFRRS converter venue dropdown, NCAA documentation, and university athletics websites.

| Venue | City, State | Elevation (ft) |
|---|---|---|
| Texas Tech | Lubbock, TX | 3,195 |
| South Dakota Mines | Rapid City, SD | 3,202 |
| Montana | Missoula, MT | 3,209 |
| Chadron State | Chadron, NE | 3,369 |
| Black Hills State | Spearfish, SD | 3,640 |
| UTEP | El Paso, TX | 3,740 |
| New Mexico State | Las Cruces, NM | 3,896 |
| Utah | Salt Lake City, UT | 4,226 |
| Weber State | Ogden, UT | 4,299 |
| Idaho State | Pocatello, ID | 4,462 |
| Utah State | Logan, UT | 4,535 |
| BYU | Provo, UT | 4,551 |
| Montana State | Bozeman, MT | 4,793 |
| New Mexico (UNM) | Albuquerque, NM | 4,958 |
| Colorado State | Fort Collins, CO | 5,003 |
| Colorado (CU) | Boulder, CO | 5,328 |
| Colorado Mines | Golden, CO | 5,675 |
| Air Force | Colorado Springs, CO | 6,621 |
| Northern Arizona | Flagstaff, AZ | 6,909 |
| Wyoming | Laramie, WY | 7,220 |
| Adams State | Alamosa, CO | 7,544 |
| Western State | Gunnison, CO | 7,703 |

**Note:** The full NCAA list has 38 designated facilities. The remaining ~16 venues (mostly smaller D2/D3 programs in CO, WY, NM, and the high-altitude venues in NC like Appalachian State at 3,333 ft) need to be completed during Phase 2 data collection. The TFRRS converter dropdown contains the authoritative list — scrape venue names and cross-reference with public elevation data.

### 3.3 Mapping Races to Venues

At ingestion (Pass 1), each race is tagged with a `venue_id`. The venue is determined by the meet location, which is available in the scraped meet data from DirectAthletics and Hy-Tek results. **The developer must build a fuzzy matcher** that maps meet location strings to the venue table, since meet data uses inconsistent naming (e.g., "UNM Track", "Albuquerque, NM", "University Stadium - Albuquerque").

For any race at a venue with `is_altitude = true`, the altitude adjustment pipeline activates. For races at venues below 3,000 ft or where venue cannot be determined, `adjustment_pct = 0` and `normalized_time = raw_time`.

---

## 4. Event Conversion — Mile ↔ 1500m

### 4.1 When This Applies

Some collegiate meets still use the Mile (1,609.34m) rather than the 1500m. For PACE's per-distance SDR calculations, Mile and 1500m performances must be on a common scale. The NCAA's published conversion factor handles this.

### 4.2 Formula

From the NCAA Standardized Track Event Conversion Factors document:

```
Mile → 1500m:
  time_1500m_sec = time_mile_sec × 0.9259

1500m → Mile (inverse):
  time_mile_sec = time_1500m_sec / 0.9259
```

**Usage rule:** Always round the final hundredth **up** (ceiling to 0.01s), per NCAA convention.

**Example:**
```
Mile time: 3:49.71 = 229.71 seconds
229.71 × 0.9259 = 212.68 seconds (truncated)
Verify: 229.71 × 0.9259 = 212.6834...
Rounded up: 212.69 seconds = 3:32.69
→ A 3:49.71 Mile is equivalent to a 3:32.69 1500m
```

### 4.3 Implementation Decision: Canonical Distance

PACE must decide which distance is canonical for SDR computation. **Recommendation:** Use **1500m** as the canonical distance. Convert all Mile performances to 1500m-equivalent before WA scoring and SDR computation. Rationale:

- WA scoring tables are natively defined for 1500m, not the Mile
- International standard is 1500m
- The 1500m is the NCAA championship event (the Mile is not contested at NCAA outdoor championships)

Store both the original event label and the converted time:

```
event_original:    "mile"
time_original_sec: 229.71
event_canonical:   "1500m"
time_canonical_sec: 212.69
conversion_applied: "mile_to_1500m"
conversion_factor:  0.9259
```

### 4.4 Other Event Conversions (Out of Scope for v1)

These are published NCAA conversion factors preserved here for future reference. PACE v1 does not need them since it only ingests outdoor 800m–10K events:

| Original | Converted To | Factor | Notes |
|---|---|---|---|
| 55m (men) | 60m (men) | 1.0749 | Indoor sprint, not in PACE v1 |
| 55m (women) | 60m (women) | 1.0771 | Indoor sprint, not in PACE v1 |
| 55mH (men) | 60mH (men) | 1.0766 | Indoor hurdles, not in PACE v1 |
| 55mH (women) | 60mH (women) | 1.0755 | Indoor hurdles, not in PACE v1 |
| Mile Relay | 4×400m Relay | 0.9942 | Relay, not in PACE v1 |
| 4×110yd Relay | 4×100m Relay | 0.9942 | Outdoor relay, not in PACE v1 |

---

## 5. Indoor Facility Indexing (Future — Not in PACE v1)

PACE v1 is outdoor-only, so indoor facility conversions are out of scope. This section documents the NCAA system for future reference.

### 5.1 Track Type Categories

The NCAA classifies indoor tracks into three categories. Research concluded there is **no statistical difference** between banked 200m and oversized (>200m) track performances, so they share a single category:

| Category | Definition |
|---|---|
| **Flat** | Standard 200m flat track (reference standard) |
| **Banked / Oversized** | Banked 200m track OR any track >200m circumference |
| **Undersized** | Flat track with <200m circumference |

### 5.2 Conversion Multipliers (D1/D3)

These are multiplicative factors applied to finish time in seconds. Source: NCAA Indoor Track Facility Indexing Conversion Summary and CIS Indoor Track Conversion Ratios document (which reproduces the NCAA values).

**Men — Flat ↔ Banked/Oversized:**

| Event | Flat → Banked/Oversized | Banked/Oversized → Flat |
|---|---|---|
| 200m | 0.9824 | 1/0.9824 ≈ 1.0179 |
| 300m | 0.9835 | 1.0168 |
| 400m | 0.9843 | 1.0160 |
| 500m | 0.9848 | 1.0154 |
| 600m | 0.9852 | 1.0150 |
| 800m | 0.9859 | 1.0143 |
| 1000m | 0.9864 | 1.0138 |
| 1500m | 0.9872 | 1.0130 |
| Mile | 0.9874 | 1.0128 |
| 3000m | 0.9885 | 1.0116 |
| 5000m | 0.9894 | 1.0107 |

**Men — Undersized → Flat:**

| Event | Undersized → Flat |
|---|---|
| 200m | 0.9872 |
| 300m | 0.9890 |
| 400m | 0.9901 |
| 600m | 0.9915 |
| 800m | 0.9923 |
| 1000m | 0.9929 |
| 1500m | 0.9939 |
| Mile | 0.9941 |
| 3000m | 0.9953 |
| 5000m | 0.9961 |

**Women — Flat ↔ Banked/Oversized:**

| Event | Flat → Banked/Oversized |
|---|---|
| 200m | 0.9847 |
| 300m | 0.9860 |
| 400m | 0.9869 |
| 500m | 0.9874 |
| 600m | 0.9879 |
| 800m | 0.9886 |
| 1000m | 0.9892 |
| 1500m | 0.9901 |
| Mile | 0.9902 |
| 3000m | 0.9915 |
| 5000m | 0.9924 |

**Women — Undersized → Flat:**

| Event | Undersized → Flat |
|---|---|
| 200m | 0.9900 |
| 300m | 0.9918 |
| 400m | 0.9929 |
| 600m | 0.9943 |
| 800m | 0.9951 |
| 1000m | 0.9958 |
| 1500m | 0.9967 |
| Mile | 0.9969 |
| 3000m | 0.9981 |
| 5000m | 0.9989 |

**Division II** uses a separate distance-based formula that varies with the track's exact measured circumference (e.g., a 182m track gets a different factor than a 160m track). This was adopted after a 2019 recommendation. The exact formula is not publicly documented.

### 5.3 Application Rule

```
converted_time_sec = actual_time_sec × multiplier
```

Always round the last digit of the final time **up** (ceiling to 0.01s).

---

## 6. Supabase Schema for Normalized Times

### 6.1 Race Results Table — New Fields

Add these columns to the existing race results table:

```sql
ALTER TABLE race_results ADD COLUMN IF NOT EXISTS
    -- Raw ingested data (never modified after ingestion)
    raw_time_sec            NUMERIC(8,2)  NOT NULL,
    raw_event               TEXT          NOT NULL,   -- "800m", "1500m", "mile", "5000m", etc.
    
    -- Venue linkage
    venue_id                TEXT          REFERENCES venues(id),
    venue_elevation_ft      INT,
    
    -- Normalization outputs
    normalized_time_sec     NUMERIC(8,2),             -- sea-level, canonical-event equivalent
    canonical_event         TEXT,                      -- "1500m" if original was "mile", else same as raw_event
    
    -- Audit trail: which conversions were applied
    altitude_adjusted       BOOLEAN       DEFAULT FALSE,
    altitude_adjustment_pct NUMERIC(8,6),             -- e.g., 0.005580
    event_converted         BOOLEAN       DEFAULT FALSE,
    event_conversion_factor NUMERIC(8,4),             -- e.g., 0.9259
    normalization_pass_at   TIMESTAMPTZ,              -- when Pass 2 last ran on this row
    normalization_version   TEXT;                      -- spec version, e.g., "v1.0"
```

### 6.2 Normalization Pipeline Logic (Pseudocode)

```python
def normalize_race(race):
    """Pass 2: Convert raw time to sea-level, canonical-event equivalent."""
    
    time = race.raw_time_sec
    event = race.raw_event
    
    # Step 1: Event conversion (Mile → 1500m)
    if event == "mile":
        time = ceil_hundredths(time * 0.9259)
        race.event_converted = True
        race.event_conversion_factor = 0.9259
        race.canonical_event = "1500m"
    else:
        race.canonical_event = event
    
    # Step 2: Altitude adjustment
    if race.venue_id and venue_is_altitude(race.venue_id):
        pct = lookup_altitude_adjustment(race.venue_id, race.canonical_event)
        if pct is not None and pct > 0:
            time = ceil_hundredths(time * (1 - pct))
            race.altitude_adjusted = True
            race.altitude_adjustment_pct = pct
    
    race.normalized_time_sec = time
    race.normalization_pass_at = now()
    race.normalization_version = "v1.0"
    
    return race


def ceil_hundredths(seconds):
    """Round up to nearest 0.01s (NCAA convention)."""
    import math
    return math.ceil(seconds * 100) / 100


def lookup_altitude_adjustment(venue_id, event):
    """
    Query the altitude_adjustments table.
    Returns adjustment_pct or None if not found.
    """
    # SELECT adjustment_pct FROM altitude_adjustments
    # WHERE venue_id = $1 AND event_distance = $2
    pass
```

### 6.3 Conversion Order

**Event conversion runs BEFORE altitude adjustment.** Rationale: the altitude adjustment percentages in the NCAA tables are calibrated against standard event distances. A Mile run at altitude should first be converted to 1500m-equivalent time, then the 1500m altitude adjustment applied — not the Mile altitude adjustment (which may differ slightly due to the 109m distance difference).

### 6.4 Idempotency

Pass 2 must be **idempotent** — running it twice on the same race produces the same result. Always recompute from `raw_time_sec` and `raw_event`, never from `normalized_time_sec`. This allows safe re-runs when altitude adjustment values are updated.

---

## 7. Integration with Downstream Passes

### 7.1 WA Performance Score (SDR Composite Spec Section 3)

The WA scoring formula `WA_points = a × (b − T)^c` consumes `T = normalized_time_sec`. The event-specific coefficients (`a`, `b`, `c`) are selected based on `canonical_event`, not `raw_event`.

### 7.2 KsA Profiling (SDS Spec)

KsA classification via cross-distance inference (e.g., "2:00 800m paired with a 30:31 10K signals aerobic-dominant") must use normalized times. An athlete running 2:02 800m at altitude that normalizes to 2:00.80 has a different KsA profile than the raw time suggests.

### 7.3 Tier Assignment (SDS Spec Section 5.4)

Tier boundaries are defined in WA points. Since WA points are computed from normalized times, tier assignment is automatically altitude-corrected.

### 7.4 SDS Split Analysis (SDS Spec)

Split deviation is computed from **raw splits**, not normalized times. Pacing behavior is independent of altitude — a runner who goes out too fast at altitude still went out too fast. However, the **SDS thresholds** (what counts as "too fast" or "too slow") are tier-dependent, and tier assignment uses normalized times. So altitude normalization indirectly affects SDS through the tier pathway.

### 7.5 CSI Field Strength (SDR Composite Spec Section 4)

CSI computes `mean WA points of top-5 finishers`. All WA points are computed from normalized times, so CSI is automatically altitude-corrected. An altitude meet where everyone ran "slow" raw times will have appropriately credited WA scores.

---

## 8. Bootstrapping the Altitude Table — Implementation Playbook

This section is a step-by-step guide for the developer building Pass 2.

### 8.1 Phase 1: Hardcode Known Values (Day 1)

Create the `altitude_adjustments` table and seed it with the Albuquerque data points extracted from the UNM conversion tables:

```sql
INSERT INTO altitude_adjustments (venue_id, event_distance, adjustment_pct, source, confidence) VALUES
-- Albuquerque Convention Center, 4958 ft
-- 800m: verified from published NCAA conversion chart
('unm_albuquerque', '800m', 0.00558, 'ncaa_published', 'verified'),
-- Additional ABQ values to be extracted from the full UNM PDF (mile, 3000m, 5000m charts)
-- These follow the same pattern: constant percentage across the performance range
;
```

### 8.2 Phase 2: Sample TFRRS Converter (Week 1)

Write a script that submits marks to `POST tfrrs.org/conversion` with the following form fields (from inspection of the page):

```
season_type:     "OUTDOOR"
gender:          "MEN" or "WOMEN"  
venue:           [venue string from dropdown]
event:           [event string]
mark:            [time string, e.g., "14:30.00"]
target_type:     [not needed for altitude — use same track type]
conversion_rules: "Divisions I/III" or "Division II"
```

**Sampling strategy:**
- For each altitude venue in the dropdown: submit 3 marks per event (fast/mid/slow collegiate range)
- Events to sample: 800m, 1500m, Mile, 3000m Steeple, 5000m, 10000m
- Compute adjustment_pct from each; verify constant across marks; store mean

**Note on legality:** The TFRRS TOS prohibits automated scraping. The sampling can be done manually (684 lookups ÷ ~10 per minute = ~70 minutes of focused data entry) or by finding the equivalent conversion tables published by individual university athletic departments. Many high-altitude schools publish their own conversion guides (as UNM did) since their athletes frequently encounter this issue.

### 8.3 Phase 3: Validate and Launch

Before enabling altitude adjustment in production:

1. **Spot-check** 20 random altitude race results against TFRRS converted times
2. **Verify** that WA scores for altitude athletes align with TFRRS performance list rankings
3. **Confirm** that adjustment percentages are gender-independent for distance events (the NCAA uses the same altitude tables for men and women in distance events; verify this holds in sampled data)

### 8.4 Phase 4: Parametric Model (Post-Launch)

Once the lookup table has been populated for all 38 venues and validated, fit a parametric model as a backup. This model can handle:
- New venues not in the lookup table
- Meets at non-standard venues (e.g., a one-off meet at a high-altitude non-NCAA facility)
- Sanity-checking the lookup table values

---

## 9. Edge Cases and Decision Rules

### 9.1 Unknown Venue

If a race cannot be mapped to a venue (meet location string doesn't match any venue in the database):
- Set `altitude_adjusted = FALSE`
- Set `normalized_time_sec = raw_time_sec` (after any event conversion)
- Flag `venue_id = NULL` for manual review
- Log as data quality issue

### 9.2 Venue at ≥3,000 ft but Missing Altitude Table Entry

If a venue is marked `is_altitude = TRUE` but no matching row exists in `altitude_adjustments` for the specific event:
- **If the parametric model is available:** use interpolated value, set `source = "model_interpolated"`, `confidence = "estimated"`
- **If no model:** do not adjust, set `altitude_adjusted = FALSE`, flag for data collection

### 9.3 Races at Venues Just Below 3,000 ft

The NCAA uses a hard cutoff at 3,000 ft. Boise State at 2,730 ft, for example, receives no adjustment despite meaningful altitude. PACE follows the NCAA convention for v1 to maintain comparability with TFRRS rankings. A future enhancement could use a smooth ramp-in starting at ~2,500 ft rather than a hard threshold.

### 9.4 Hand-Timed Races

PACE v1 ingests FAT-only times. If a hand-timed result somehow enters the pipeline, the standard FAT conversion (+0.24s for distances ≤200m) should be applied before normalization. For distance events (≥800m), hand timing is not meaningfully different from FAT and no conversion is needed.

### 9.5 Steeplechase

The 3000m Steeplechase uses the same altitude adjustment as the 3000m flat. The water jump and barriers add time equally at all altitudes — the altitude effect is purely from reduced O₂, not mechanical/technical factors. Sample the 3000m Steeple altitude values from TFRRS to confirm, but expect them to match 3000m flat percentages closely.

### 9.6 Altitude-Trained Athletes

The NCAA does **not** differentiate between altitude-trained and sea-level athletes. A runner from Adams State who races at home gets the same altitude credit as a visiting sea-level runner. PACE follows this convention. Modeling acclimatization effects is out of scope for a rating system.

---

## 10. Standalone TFRRS-Style Converter Tool (Feature B)

### 10.1 Purpose

Beyond the SDR pipeline, PACE can offer a standalone mark converter as a user-facing feature — a reimplementation of the TFRRS converter. This section defines the scope.

### 10.2 Feature Parity with TFRRS

The TFRRS converter supports three input dimensions:

| Input | TFRRS Options | PACE v1 Scope |
|---|---|---|
| Season | Indoor / Outdoor | Outdoor only (indoor = future) |
| Gender | Men / Women | Both |
| Venue | 600+ indoor facilities | 38 outdoor altitude venues |
| Event | Sprints through relays | 800m through 10K + Steeple |
| Target Track Type | Flat / Banked / Undersized | N/A (outdoor is standardized) |
| Conversion Rules | D1/D3 / D2 | D1/D3 only (D2 = future) |

### 10.3 PACE Converter: Simplified Outdoor-Only Interface

```
Inputs:
  - Event: 800m | 1500m | Mile | 3000m Steeple | 5000m | 10000m
  - Venue: [dropdown of 38 altitude venues, plus "Sea Level (no adjustment)"]
  - Mark: [time input, e.g., "14:30.00"]
  - Gender: Men | Women (may not affect distance events, but include for completeness)
  
Outputs:
  - Sea-level equivalent time
  - Adjustment applied (seconds and percentage)
  - WA Performance Score for both raw and adjusted times
  - PACE tier for both
```

This converter doubles as a **validation tool** — coaches can compare PACE's adjusted times against TFRRS and flag discrepancies.

---

## 11. Open Items and Research Dependencies

| Item | Priority | Status | Notes |
|---|---|---|---|
| Populate altitude_adjustments for all 38 NCAA venues | **P0** | Blocked on Phase 2 data collection | Unblocks launch of altitude-adjusted SDR |
| Verify altitude adjustments are gender-independent for distance events | **P0** | Can be answered during Phase 2 sampling | If not, need separate men's/women's adjustment tables |
| Complete venue list (identify remaining ~16 altitude venues) | **P1** | Partial — 22 of 38 identified | TFRRS dropdown is authoritative source |
| Build venue fuzzy matcher for meet-to-venue mapping | **P1** | Not started | Critical for Pass 1 → Pass 2 linkage |
| Extract full ABQ conversion tables for Mile, 3000m, 5000m | **P1** | UNM PDF available, need to parse remaining charts | 800m is done; other events need extraction |
| Parametric altitude model fitting | **P2** | Deferred to post-Phase 2 | Only needed for edge cases and new venues |
| Indoor facility indexing (D1/D3 multipliers) | **P3** | Documented in this spec (Section 5) but not implemented | Needed when PACE expands to indoor |
| D2 distance-based indoor conversion formula | **P3** | Formula not publicly documented | Reverse engineering needed if D2 indoor is added |

---

## 12. Appendix: Source Documents

| Document | URL | Content |
|---|---|---|
| NCAA Standardized Track Event Conversion Factors | `ncaaorg.s3.amazonaws.com/championships/sports/crosstrack/common/XTF_EventConversions.pdf` | Mile → 1500m (0.9259), 55m → 60m, relay conversions |
| NCAA Indoor Track Facility Indexing Conversion Summary | `ncaaorg.s3.amazonaws.com/championships/sports/crosstrack/common/XTF_FacilityIndexingConversionSummary.pdf` | Full flat/banked/undersized multiplier tables, research methodology |
| CIS Indoor Track Conversion Ratios | `files.trackie.com/uploads/article-inner/Documents/CIS-Indoor-Track-Conversion-Ratios.pdf` | Reproduces NCAA multipliers in a clean, parseable format |
| UNM Altitude Conversion Guide (Dr. Ceronie) | `storage.googleapis.com/golobos-prod/2026/01/19/tHzy39lXSLneDAzvuh86uUyKMbwCFs6ZSoHZteFG.pdf` | Exact 800m, Mile, 3000m, 5000m conversion tables for Albuquerque (4,958 ft) |
| Jeff Chen — IAAF Scoring Tables | `github.com/jchen1/iaaf-scoring-tables` | Reverse-engineered WA scoring coefficients (R² > 0.999), referenced in SDR Composite Spec Section 3.2 |
| TFRRS Mark Converter | `tfrrs.org/conversion` | Live converter tool — source of truth for validation against PACE outputs |

---

*Document version 1.0 — 2026-04-04.*  
*Extends SDR Composite Spec Addendum v1.0 and SDS Methods Spec v2.0.*  
*Resolves the P0 altitude research dependency for PACE development.*  
*Next revision upon completion of Phase 2 altitude table population.*
