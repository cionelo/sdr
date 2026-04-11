# World Athletics Scoring Tables — Methodology Reference for PACE

## Overview

The World Athletics (formerly IAAF) scoring tables are the most rigorous publicly available tier system for athletics. They assign a numeric point score to every valid performance at every recognized distance, normalized across event types, distances, and sexes. This makes them a near-perfect anchor for PACE's rating algorithm — instead of inventing tier equivalence across the 800m, mile, 5K, and 10K, the problem is already solved empirically.

---

## The Formula

All point values in the tables follow a **power-law model**:

```
P = a · (M − b)^c
```

Where:
- `P` = points (score)
- `M` = measured performance (for running events: `M = −T`, where T is time in seconds, since faster = better)
- `a`, `b`, `c` = event-specific and sex-specific constants

For a running event like the 5K (men), this becomes:

```
P = a · (−T − b)^c
```

where `T` is your finish time in seconds. The three coefficients are unique to each `(event, sex)` pair.

> **Source:** [Comparing and forecasting performances in different events of athletics (arXiv:1408.5924)](https://arxiv.org/pdf/1408.5924) — formally documents the formula shape and notes that the IAAF has used this model since at least 2001.

---

## Empirical Methodology

The Spiriev tables are **data-driven, not theoretically derived.** The process:

1. **Collect a large corpus of competitive performances** across all events for both sexes (updated every few years — the 2025 edition incorporates data from 2022–2024 seasons).
2. **Fit the power-law curve** (`P = a(M−b)^c`) to the distribution of real-world performances for each event.
3. **Calibrate anchor points** — world-record-level performances are assigned ~1300 points; the lower bound ("walking is not running") is empirically estimated as the threshold below which a performance is no longer competitive running.
4. **Publish as lookup tables** — the PDFs contain every mark-to-point mapping at useful precision intervals.

The methodology is **partially public**:
- The formula shape and the general approach are documented in academic literature.
- The specific fitting algorithm and calibration details are proprietary to Bojidar Spiriev (creator, 1982) and now maintained by his son Attila.
- The tables themselves are freely downloadable from World Athletics.

> **Source:** [World Athletics — 2025 scoring tables announcement](https://worldathletics.org/news/news/scoring-tables-2025)  
> **Source:** [A mathematical model for scoring athletic performances (UNC Press)](https://janeway.uncpress.org/ms/article/1218/galley/1914/view/)

---

## Why the Coefficients Aren't Officially Published

World Athletics publishes the PDFs, not the fitted coefficients. The values of `a`, `b`, `c` are **reverse-engineered by practitioners** via polynomial regression on the (mark, points) tuples in the tables. Jeff Chen did exactly this for both the 2022 and 2025 editions:

> Parsed all (mark, point) tuples from the PDFs, ran polynomial regression per `(event, sex)` pair, achieved **R² > 0.999** for every event.

This means the formula is practically recoverable at near-perfect precision, even without official publication.

> **Source:** [Calculating World Athletics Scoring Table Coefficients — Jeff Chen](https://jeffchen.dev/posts/Calculating-World-Athletics-Coefficients/)  
> **Source / Calculator:** [World Athletics Points Calculator (2025 tables)](https://jeffchen.dev/projects/track/points-calculator/)  
> **Parsed JSON (open source):** [github.com/jchen1/iaaf-scoring-tables](https://github.com/jchen1/iaaf-scoring-tables)

---

## Cross-Distance Normalization

This is the key property for PACE. Because all events are fit to the same empirical performance distribution, a given point score means approximately the same thing regardless of event:

| Performance | Event | Points (approx.) |
|---|---|---|
| 1:44 | 800m (M) | ~1100 |
| 3:50 | 1500m (M) | ~1100 |
| 13:00 | 5K (M) | ~1100 |
| 27:00 | 10K (M) | ~1100 |

These athletes are all performing at roughly the same relative level of world-class achievement. The tables handle the distance-normalization math — PACE doesn't need to.

---

## Tier Bucket Design for PACE

### Recommended Tier Anchors (Men's Distance)

| Tier | Label | Point Range | Example 5K | Context |
|---|---|---|---|---|
| **S** | Elite / OTC | 1100+ | sub-13:20 | Post-collegiate elite, Olympic bubble |
| **A** | NCAA D1 All-American | 950–1100 | 13:20–13:55 | Top 8 nationals |
| **B** | NCAA D1 Competitive | 850–950 | 13:55–14:30 | Consistent scorer |
| **C** | NCAA D2 / D1 Fringe | 750–850 | 14:30–15:10 | D2 All-American range |
| **D** | Varsity Competitive | 650–750 | 15:10–16:00 | Mid-pack D2 / D3 |
| **E** | Developmental | 500–650 | 16:00–17:30 | JUCO / walk-on range |

> Adjust thresholds per event using the scoring tables directly. The point ranges hold cross-distance; the example times are 5K only.

### Implementation Options

**Option A — Table Lookup (simplest, most authoritative)**  
Use Jeff Chen's parsed JSON directly. For any input `(event, sex, time)`, binary-search the table for the closest mark and return the mapped point score. Define tier cuts as point thresholds. No coefficients needed.

**Option B — Fitted Coefficients (better for production)**  
Use the reverse-engineered `a`, `b`, `c` per event from Chen's repo. Compute `P = a · (−T − b)^c` inline. Faster, no table lookup, trivially extensible to interpolated marks.

**Option C — Hybrid**  
Use the table for bucket boundary definitions (authoritative anchors), use the formula for live scoring (fast computation).

---

## Key References

| Resource | URL |
|---|---|
| World Athletics 2025 tables (PDF download) | https://worldathletics.org/about-iaaf/documents/technical-information |
| 2025 tables update announcement | https://worldathletics.org/news/news/scoring-tables-2025 |
| Jeff Chen's points calculator | https://jeffchen.dev/projects/track/points-calculator/ |
| Jeff Chen's methodology post | https://jeffchen.dev/posts/Calculating-World-Athletics-Coefficients/ |
| Open-source parsed JSON + code | https://github.com/jchen1/iaaf-scoring-tables |
| arXiv paper (formula documentation) | https://arxiv.org/pdf/1408.5924 |
| Academic model paper (UNC Press) | https://janeway.uncpress.org/ms/article/1218/galley/1914/view/ |
| CALTAF legacy calculator (2017 tables) | https://caltaf.com/pointscalc/calc.html |

---

*Prepared for PACE — race prediction and seeding tool for collegiate track and field.*
