# SDR Implementation Guide

**Split Deviation Rating -- How PACE Rates Athletes**

This document explains how PACE's SDR algorithm works, what it measures, and why it exists. It is written for coaches who understand running but not software engineering.

---

## 1. What Is SDR?

SDR stands for **Split Deviation Rating**. It is a composite athlete rating designed for collegiate track and field distance events (800m through 10,000m).

Most ranking systems use finish time alone. SDR goes further. It measures **how** an athlete ran, not just how fast. Two runners can cross the line at the same time, but one may have executed a tactically brilliant race while the other barely held on after going out too hard. SDR distinguishes between them.

Key properties:

- **Per athlete, per distance.** A runner has a separate 1500m SDR and a separate 5K SDR. These are independent ratings.
- **Modular.** SDR is built from several independent factors. Coaches can configure which factors matter, how much weight each carries, and how races are aggregated over a season.
- **Transparent.** Every factor, threshold, and calibration source is visible. Coaches always know what went into a rating and how confident the system is in it.

---

## 2. The Rating Components

SDR combines several factors into a single number. Each factor captures something different about an athlete's performance.

### 2.1 WA Performance Score (default: 75% of the rating)

This is the backbone. It answers: **how fast did the athlete run, on a scale that works across all distances?**

The WA Performance Score uses the World Athletics scoring tables -- the same system used internationally to compare performances across events. These tables convert any finish time at any distance into a point value. A 1000-point 5K runner and a 1000-point 800m runner are performing at roughly equivalent levels, even though their events are completely different.

For reference, a men's 5K in roughly 14:00 scores around 1000 WA points. A men's 800m in roughly 1:52 scores similarly.

**How it works under the hood:** PACE uses a mathematical formula fitted to the official 2025 WA scoring tables. The formula takes a finish time in seconds and returns a point score:

```
Points = a * T^2 + b * T + c
```

where T is the finish time in seconds, and a, b, c are constants specific to each event and sex. These constants come from Jeff Chen's reverse-engineering of the WA tables, with a fit accuracy above 99.9% (R-squared > 0.999). The formula reproduces the official tables almost exactly.

### 2.2 SDS -- Split Deviation Score (default: 15% of the rating)

SDS measures **pacing quality**: did the athlete execute their race well?

For every race with complete split data, PACE compares the athlete's actual split distribution to a personalized expected baseline. That baseline is not one-size-fits-all. It accounts for:

- The athlete's physiological profile (speed-dominant vs. endurance-dominant -- more on this in Section 4)
- Their performance level (tier)
- Their sex
- Their finish time

A positive SDS means the athlete ran smarter than expected. A negative SDS means they made pacing errors that cost them.

**Why this matters for coaching:** An athlete who runs negative splits (running the second half faster than the first) in a distance event is demonstrating a level of fitness that their finish time alone does not reveal. Strong closing velocity is a signal that the athlete is fitter than their time suggests. A coach looking at two athletes with identical 5K PRs should prefer the one whose SDS says "this athlete ran smart and closed hard" over the one whose SDS says "this athlete went out too fast and hung on."

**Event-specific baselines.** The expected pacing pattern differs by event:

- **800m:** A positive split (first lap faster than second) is expected and biomechanically optimal. The 800m is essentially an extended sprint where anaerobic energy dominates the first lap.
- **1500m / Mile:** Surge-even-kick pattern. Slightly elevated opening 300m, even middle laps, strong closing kick.
- **5000m:** Even pacing with a controlled opening kilometer and an accelerating final kilometer.
- **10000m:** Even to slight negative split, with more tolerance for mid-race fluctuation than the 5K.

### 2.3 CSI -- Competition Strength Index (default: 5% of the rating)

A small adjustment for the quality of the competition field.

A 14:15 5K against a field of 13:30 runners means more than a 14:15 against a field of 15:00+ runners. CSI captures this by comparing the WA points of the top finishers in a race against what is typical for athletes of that caliber.

CSI is deliberately capped at a maximum of plus or minus 3% influence on the final rating. It is meant to be a nudge, not a driver. The finish time and pacing quality should dominate.

### 2.4 Confidence Regression

Athletes with fewer races get a mild pull toward their performance tier's average score. This prevents a single-race outlier from topping a leaderboard.

The effect is small and disappears quickly:

| Races completed | Regression pull | Effect |
|---|---|---|
| 1 race | 15% pull toward tier mean | Mild dampening of an unproven rating |
| 2 races | 8% pull toward tier mean | Smaller dampening |
| 3+ races | No pull | Rating stands on its own |

Importantly, the regression pulls toward the **tier mean for the athlete's best performance**, not the overall population average. A one-race athlete who scored 980 points regresses toward the A/S-tier mean (~1025), not toward the middle of the pack. The adjustment is small -- that 980 becomes roughly 973.

Every SDR score on the leaderboard displays a visual confidence badge so coaches can see at a glance how much data backs the rating:

| Badge | Label | Meaning |
|---|---|---|
| Open circle (1/4 filled) | Provisional | 1 race |
| Half circle | Limited | 2 races |
| 3/4 circle | Moderate | 3-4 races |
| Full circle | High | 5+ races |

---

## 3. Altitude Normalization

**A 14:30 5K at Adams State (7,544 feet) is a fundamentally different performance than a 14:30 at sea level.**

At altitude, the air has less oxygen. Distance runners are penalized because their muscles cannot access oxygen as efficiently. The longer the race, the bigger the penalty -- a 10K is roughly 98% aerobically powered, so altitude hits it harder than an 800m (roughly 60% aerobic).

PACE converts all times from altitude venues (3,000 feet and above) to their sea-level equivalents before any scoring happens. This uses the same methodology as the NCAA/TFRRS altitude conversion system.

**How it works:**

```
adjusted_time = raw_time * (1 - adjustment_percentage)
```

The adjustment percentage depends on two things: how high the venue is and how long the race is. A few examples to illustrate:

| Venue | Elevation | Event | Approximate adjustment |
|---|---|---|---|
| Texas Tech (Lubbock, TX) | 3,195 ft | Mile | ~1.15% (~3.5 seconds off a 5:00 mile) |
| UNM (Albuquerque, NM) | 4,958 ft | 800m | ~0.56% (~0.6 seconds off a 1:50) |
| Adams State (Alamosa, CO) | 7,544 ft | Mile | ~4.22% (~12.6 seconds off a 5:00 mile) |

PACE currently covers 22 NCAA altitude venues ranging from 3,195 feet (Texas Tech) to 7,703 feet (Western State in Gunnison, CO). The adjustment values are derived from published NCAA conversion tables where available, and estimated from a fitted model for the rest. Every adjustment is tagged with a confidence level ("verified" from published tables, or "estimated" from the model) so coaches know the source.

**Raw times are always preserved.** The normalized time is stored alongside the original. If a better altitude model becomes available in the future, PACE can re-run the normalization step and everything downstream updates automatically.

---

## 4. Athlete Profiling: The KsA System

Not all distance runners are the same. Some are speed-dominant (think of the 800m runner who can also run a decent 1500m). Others are endurance-dominant (the 10K specialist who grinds out even splits). Their "optimal" pacing patterns are different, and SDR accounts for this.

PACE classifies athletes using **KsA -- the Coefficient of Special Endurance**, a metric from published research by Blodorn and Doring (2025, two studies with 34,000+ race times combined). KsA compares an athlete's pace at one distance to their pace at an adjacent distance:

```
KsA = pace at shorter distance / pace at longer distance
```

- A KsA close to 1.0 means the athlete loses very little pace as the distance increases. This signals strong aerobic endurance.
- A lower KsA means the athlete slows down more as distance increases. This signals a more speed/anaerobic-dominant profile.

For example, the research median KsA for men at the 800m/1500m pair is 0.921. An athlete with a personal KsA of 0.940 at that pair is more endurance-oriented than average. An athlete at 0.900 is more speed-oriented.

**How PACE uses this:** Each athlete is classified into one of three archetypes:

- **Aerobic dominant** -- strong endurance relative to speed
- **Anaerobic dominant** -- strong speed relative to endurance
- **Hybrid** -- balanced profile

The archetype determines the expected pacing curve used in the SDS calculation. A speed-dominant 800m runner naturally runs a wider positive split (faster first lap, slower second) than an endurance runner, so the SDS baseline is adjusted accordingly. Without this adjustment, speed-dominant runners would be unfairly penalized for pacing patterns that are physiologically normal for them.

**Sex-specific baselines.** Female athletes show more pronounced pace loss from 100m to 1500m than males. The values converge at 5000m and above. PACE uses separate KsA reference tables for men and women.

---

## 5. Performance Tiers

Every athlete is assigned a performance tier based on their WA points score. Tiers serve two purposes: they provide quick context for coaches, and they calibrate SDS thresholds.

| Tier | WA Points | Men's 5K Approx. | Context |
|---|---|---|---|
| S | 1100+ | sub-13:20 | Post-collegiate elite / Olympic bubble |
| A | 950--1100 | 13:20--13:55 | NCAA D1 All-American range |
| B | 850--950 | 13:55--14:30 | NCAA D1 competitive scorer |
| C | 750--850 | 14:30--15:10 | D2 All-American / D1 fringe |
| D | 650--750 | 15:10--16:00 | Mid-pack D2 / D3 competitive |
| E | 500--650 | 16:00--17:30 | JUCO / developmental |

The 5K times listed above are approximate and for men only. The tier boundaries are defined in WA points, so they apply across all events and both sexes automatically.

**Why tiers matter for SDS:** Lower-tier athletes naturally have higher pacing variance from lap to lap. An E-tier 5K runner going 2.5% fast on a single lap might just be inexperienced, not making a tactical error. If the pacing thresholds were the same for all athletes, developing runners would be over-penalized. So PACE widens the thresholds at lower tiers:

- S/A tier: base thresholds (tightest scrutiny)
- B tier: thresholds widened by 12%
- C tier: widened by 24%
- D tier: widened by 36%
- E tier: widened by 48%

This means an E-tier runner needs a larger pacing deviation to trigger a penalty than an S-tier runner, which matches coaching intuition.

---

## 6. Coach Configuration

SDR is not a black box with a single output. Coaches can configure the system to answer different questions.

### Built-In Presets

Three presets are available out of the box. Each one is tuned for a specific coaching question.

**Championship Seeding -- "Who is in the best form right now?"**

Uses a 21-day decay half-life, meaning last week's race carries about twice the weight of a race from three weeks ago. All rating modules are active (WA score, SDS, CSI, confidence regression). Best for seeding athletes into championship meets when current fitness matters most.

**Season Strength -- "Who has been the strongest all season?"**

Uses a 60-day decay half-life, so performances from two months ago still carry meaningful weight. All modules active. Best for evaluating overall season contribution or award voting.

**Raw Performance -- "Just rank them by time."**

WA score only, no modifiers. PR-based. This is traditional seeding -- the baseline coaches can compare the other presets against.

### Quick Toggles

Without opening any advanced settings, coaches can:

- Select a specific event or distance group
- Turn SDS on or off
- Switch between season history mode and PR-only mode

### Advanced Configuration

For coaches who want full control, every parameter is adjustable:

- Weight of each factor (WA score, SDS, CSI)
- Aggregation method (PR-only, best 2 of last 6, or decay-weighted average)
- Decay half-life (14 to 120 days)
- CSI sensitivity and cap

A future update will allow coaches to save and share custom presets.

---

## 7. The Pipeline: How SDR Is Computed

SDR is built in five sequential passes. Each pass does one job, and each can be re-run independently if the methodology for that step improves.

### Pass 1 -- Data Collection

Race results are scraped from timing providers (DirectAthletics, Flash Results). The system parses finish times, lap splits, athlete identity, and meet metadata. Data quality flags are set: Was it FAT-timed? Are splits complete? Only races with verified FAT timing and complete splits qualify for full SDS scoring.

No calculations happen at this step. It is purely about collecting clean data.

### Pass 2 -- Normalization

Two adjustments happen here:

1. **Altitude adjustment.** Times from venues at 3,000+ feet are converted to sea-level equivalents using the methodology described in Section 3.
2. **Event conversion.** Mile times are converted to 1500m equivalents (and vice versa) so they can be compared on a common scale.

Raw times are preserved. All downstream steps operate only on the normalized times.

### Pass 3 -- Profiling

For each athlete, PACE:

- Computes KsA values across all available distance pairs
- Classifies the athlete's archetype (aerobic, anaerobic, or hybrid)
- Assigns a WA points score to every race
- Assigns a performance tier (S through E)

### Pass 4 -- Race Scoring

Every individual race is scored for pacing quality:

- A personalized baseline curve is generated based on the athlete's profile
- Each lap is compared to the expected split
- Bonuses are applied for strong closing velocity; penalties for excessive fading
- The result is a per-race SDS score

### Pass 5 -- Composite Rating

All factors come together:

- Per-race scores are aggregated across the season using the selected method (PR-only, best-of-N, or decay-weighted average)
- WA performance score, SDS, and CSI are combined according to the configured weights
- Confidence regression is applied for athletes with few races
- The final SDR is written for each athlete at each distance

**The key design principle:** each step can be re-run independently. If the altitude model improves, only Pass 2 re-runs, and everything downstream updates automatically. If the SDS formula is refined, only Pass 4 and 5 re-run. No data is lost, and raw ingested data is never modified by any calculation step.

---

## 8. Cold Start and Calibration

SDR gets smarter over time. The system goes through three calibration phases as it accumulates collegiate race data.

### Phase 1 -- Theoretical Baselines (Launch)

At launch, the pacing baselines, tier thresholds, and KsA reference values come from published research. These are scientifically grounded (34,000+ race times across two peer-reviewed studies), but they were calibrated primarily on elite and national-level runners, not collegiate athletes specifically. Scores are valid but may not perfectly capture collegiate-specific patterns.

During this phase, every score is tagged with `baseline_source: theoretical` so coaches know the system is working from research priors.

### Phase 2 -- Empirical Bootstrapping (~30 to 150 meets)

As PACE ingests more collegiate races, it begins building its own empirical baselines, stratified by event, tier, and sex. The system compares its developing baselines against the research values and logs any divergence. Expected: D2/D3 developmental athletes will show different pacing patterns than the elite athletes in the research data.

Scores are tagged with `baseline_source: empirical_bootstrap`.

### Phase 3 -- Mature Calibration (150+ meets, ongoing)

The PACE database becomes the primary source for all baselines. Research values shift to a validation role -- used for outlier detection and sanity checks, not as the primary reference. Baselines are recalibrated on a rolling basis as new meets are ingested.

Scores are tagged with `baseline_source: empirical_calibrated`.

**The bottom line:** Scores will become more precise over time as the database grows. The `baseline_source` tag is always visible so coaches know which phase they are looking at.

---

## 9. What SDR Does NOT Factor In

Some things are deliberately excluded from the rating, and it is worth explaining why.

**Pack position and lead time.** Whether an athlete led from the front or sat in a pack is not factored in. The signal-to-noise ratio is too low for a rating system -- pack dynamics are highly field-dependent and tactically confounded. Split data does not reliably capture position across timing providers.

**Head-to-head results.** Running is not chess. The "strength of what you did" is directly measurable via the clock. A head-to-head adjustment would add complexity without meaningful accuracy gains, since the finish time already captures the outcome.

**Season trajectory and improvement predictions.** SDR reflects what happened, not what might happen. Coaches can infer trajectory by looking at how an athlete's rating changes over time, but the system does not try to predict future performance.

**Weather conditions.** Temperature, wind, and humidity all affect performance, but weather normalization is complex and requires reliable per-race weather data. This is flagged as a future enhancement.

---

## Glossary

| Term | Definition |
|---|---|
| **SDR** | Split Deviation Rating. The composite rating that PACE produces per athlete per distance. |
| **SDS** | Split Deviation Score. The pacing quality component of SDR, measuring how well an athlete distributed their effort within a race. |
| **CSI** | Competition Strength Index. A small adjustment factor for the quality of the field an athlete raced against. |
| **KsA** | Coefficient of Special Endurance. A metric comparing an athlete's pace at one distance to their pace at an adjacent distance, used to classify physiological profile. |
| **WA Points** | World Athletics points. A standardized scoring system that converts any finish time at any distance to a comparable point scale. |
| **FAT** | Fully Automatic Timing. Electronic timing triggered by the starter's signal, accurate to hundredths of a second. Required for valid SDS scoring. |
| **Decay weighting** | A method of aggregating multiple race scores where more recent races count more heavily than older ones. The "half-life" determines how quickly old races lose influence. |
| **Confidence regression** | A statistical adjustment that pulls ratings with few data points mildly toward the tier average, preventing single-race outliers from dominating leaderboards. |
| **Normalization** | Converting raw times to a common standard (sea-level equivalent, outdoor track) so performances at different venues can be compared fairly. |

---

*Last updated: 2026-04-06. Based on SDR algorithm specs v2.0 (SDS Methods), v1.0 (Composite Addendum), and v1.0 (Altitude Normalization).*
