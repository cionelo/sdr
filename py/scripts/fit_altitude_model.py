"""Fit a parametric altitude adjustment model from known NCAA data points.

Model: adj = alpha * (aero ^ beta) * (dh ^ gamma)
where dh = max(0, elevation_ft - threshold) / 1000

All 4 parameters are fit from the data. Beta is initially seeded from the
ABQ 800m/Mile ratio, then all params are jointly refined.

Known data points:
  - ABQ (4958 ft) 800m:  0.558%   (ncaa_published, verified)
  - Texas Tech (3195 ft) Mile: 1.153% (ncaa_published, verified)
  - ABQ (4958 ft) Mile:  ~1.867%  (spec_estimated)
  - Adams State (7544 ft) Mile: 4.217% (ncaa_published, verified)
"""

import numpy as np
from scipy.optimize import minimize

# --- Known data points ---
KNOWN_DATA = [
    (4958, 0.60, 0.00558),   # ABQ 800m — verified
    (3195, 0.82, 0.01153),   # Texas Tech Mile — verified
    (4958, 0.82, 0.01867),   # ABQ Mile — estimated
    (7544, 0.82, 0.04217),   # Adams State Mile — verified
]

AEROBIC_FRACTIONS = {
    "800m":          0.60,
    "1500m":         0.80,
    "mile":          0.82,
    "3000m":         0.90,
    "3000m_steeple": 0.90,
    "5000m":         0.95,
    "10000m":        0.98,
}

VENUES = [
    ("texas_tech", 3195),
    ("south_dakota_mines", 3202),
    ("montana", 3209),
    ("chadron_state", 3369),
    ("black_hills_state", 3640),
    ("utep", 3740),
    ("new_mexico_state", 3896),
    ("utah", 4226),
    ("weber_state", 4299),
    ("idaho_state", 4462),
    ("utah_state", 4535),
    ("byu", 4551),
    ("montana_state", 4793),
    ("unm_albuquerque", 4958),
    ("colorado_state", 5003),
    ("colorado_cu", 5328),
    ("colorado_mines", 5675),
    ("air_force", 6621),
    ("northern_arizona", 6909),
    ("wyoming", 7220),
    ("adams_state", 7544),
    ("western_state", 7703),
]

EVENTS = ["800m", "1500m", "mile", "3000m", "3000m_steeple", "5000m", "10000m"]


def model_predict(params, elevation_ft, aerobic_fraction):
    """Compute adjustment_pct (decimal).

    Model: alpha * (aero ^ beta) * ((max(0, elev - threshold) / 1000) ^ gamma)
    """
    alpha, beta, gamma, threshold = params
    dh = max(0.0, elevation_ft - threshold) / 1000.0
    if dh <= 0:
        return 0.0
    return alpha * (aerobic_fraction ** beta) * (dh ** gamma)


def fit_model():
    """Fit all 4 parameters: alpha, beta, gamma, threshold."""

    # Initial beta from ABQ ratio (for seeding)
    beta_seed = np.log(0.00558 / 0.01867) / np.log(0.60 / 0.82)

    # Weights: verified=2.0, estimated=1.0
    weights = np.array([2.0, 2.0, 1.0, 2.0])

    def cost(p):
        alpha_t, beta_t, gamma_t, thresh_t = p
        if alpha_t <= 0 or beta_t <= 0 or gamma_t <= 0:
            return 1e10
        if thresh_t < -1000 or thresh_t > 3100:
            return 1e10
        params = (alpha_t, beta_t, gamma_t, thresh_t)
        total = 0.0
        for i, (elev, aero, actual) in enumerate(KNOWN_DATA):
            predicted = model_predict(params, elev, aero)
            if predicted <= 0 and actual > 0:
                return 1e10
            total += weights[i] * ((predicted - actual) / actual) ** 2
        return total

    best = None
    best_cost = float("inf")
    for alpha0 in [0.002, 0.004, 0.008, 0.02]:
        for gamma0 in [1.0, 1.3, 1.5, 1.8]:
            for thresh0 in [0, 500, 1500, 2500]:
                result = minimize(
                    cost,
                    x0=[alpha0, beta_seed, gamma0, thresh0],
                    method="Nelder-Mead",
                    options={"maxiter": 100000, "xatol": 1e-14, "fatol": 1e-16},
                )
                if result.fun < best_cost:
                    best_cost = result.fun
                    best = result

    alpha, beta, gamma, threshold = best.x
    params = tuple(best.x)

    print(f"  Fitted parameters:")
    print(f"    alpha     = {alpha:.8e}")
    print(f"    beta      = {beta:.6f}")
    print(f"    gamma     = {gamma:.6f}")
    print(f"    threshold = {threshold:.1f} ft")
    print(f"    Cost      = {best_cost:.6e}")

    # Verification
    print(f"\n  Residuals:")
    labels = ["ABQ 800m (V)", "TT Mile (V)", "ABQ Mile (E)", "Adams Mile (V)"]
    max_err = 0
    for i, (elev, aero, actual) in enumerate(KNOWN_DATA):
        predicted = model_predict(params, elev, aero)
        err = ((predicted - actual) / actual) * 100
        max_err = max(max_err, abs(err))
        print(f"    {labels[i]:<18} actual={actual*100:.4f}%  "
              f"pred={predicted*100:.4f}%  err={err:+.3f}%")
    print(f"    Max |err|: {max_err:.3f}%")

    return params


def format_sql(params):
    """Generate SQL INSERT statements for all venue x event combinations."""
    alpha, beta, gamma, threshold = params

    # Round threshold for the SQL comment
    thresh_int = int(round(threshold))

    lines = []
    lines.append("-- SDR: Estimated altitude adjustments from parametric model fit")
    lines.append(
        f"-- Model: adjustment_pct = alpha * (aerobic_fraction ^ beta)"
        f" * (dh ^ gamma)"
    )
    lines.append(
        f"--   where dh = max(0, elevation_ft - {thresh_int}) / 1000"
    )
    lines.append(
        f"--   alpha = {alpha:.8e}, beta = {beta:.6f},"
        f" gamma = {gamma:.6f}, threshold = {thresh_int} ft"
    )
    lines.append(
        "-- Fitted from 4 data points: ABQ 800m (verified), TT Mile (verified),"
        " ABQ Mile (estimated), Adams State Mile (verified)"
    )
    lines.append("-- Source: model_interpolated, confidence: estimated")
    lines.append(
        "-- Verified values (e.g. ABQ 800m from migration 002) are preserved"
        " via WHERE clause"
    )
    lines.append("")
    lines.append(
        "INSERT INTO sdr_altitude_adjustments"
        " (venue_id, event_distance, adjustment_pct, source, confidence) VALUES"
    )

    value_lines = []
    for venue_id, elev in VENUES:
        for event in EVENTS:
            aero = AEROBIC_FRACTIONS[event]
            adj = model_predict(params, elev, aero)
            value_lines.append(
                f"('{venue_id}', '{event}', {adj:.6f},"
                f" 'model_interpolated', 'estimated')"
            )

    for i, vl in enumerate(value_lines):
        if i < len(value_lines) - 1:
            lines.append(f"  {vl},")
        else:
            lines.append(f"  {vl}")

    lines.append("ON CONFLICT (venue_id, event_distance) DO UPDATE SET")
    lines.append("    adjustment_pct = EXCLUDED.adjustment_pct,")
    lines.append("    source = EXCLUDED.source,")
    lines.append("    confidence = EXCLUDED.confidence")
    lines.append("WHERE sdr_altitude_adjustments.confidence != 'verified';")

    return "\n".join(lines)


def main():
    print("=" * 70)
    print("PACE SDR — Altitude Model Fitting")
    print("=" * 70)
    print()

    params = fit_model()
    alpha, beta, gamma, threshold = params
    thresh_int = int(round(threshold))
    print()

    print("=" * 70)
    print("Final model:")
    print(
        f"  adj = {alpha:.8e} * (aero ^ {beta:.6f})"
        f" * (dh ^ {gamma:.6f})"
    )
    print(f"  dh = max(0, elevation_ft - {thresh_int}) / 1000")
    print("=" * 70)
    print()

    # Full table
    print("Full adjustment table (% of time):")
    header = f"  {'Venue':<22} {'Elev':>5}"
    for event in EVENTS:
        header += f" {event:>8}"
    print(header)
    print("  " + "-" * (len(header) - 2))

    for venue_id, elev in VENUES:
        row = f"  {venue_id:<22} {elev:>5}"
        for event in EVENTS:
            aero = AEROBIC_FRACTIONS[event]
            adj = model_predict(params, elev, aero)
            row += f" {adj*100:>8.3f}"
        print(row)
    print()

    # Sanity checks
    print("Sanity checks:")
    at_sea = model_predict(params, 0, 0.82) * 100
    print(f"  Sea level:         adj(0ft, mile) = {at_sea:.4f}% (should be 0)")
    below = model_predict(params, 2500, 0.82) * 100
    at_thresh = model_predict(params, threshold, 0.82) * 100
    print(f"  At threshold:      adj({thresh_int}ft, mile) = {at_thresh:.4f}%")
    print(f"  At 2500 ft:        adj(2500ft, mile) = {below:.4f}%")
    abq_800 = model_predict(params, 4958, 0.60) * 100
    abq_mile = model_predict(params, 4958, 0.82) * 100
    print(f"  800m < mile @ABQ:  {abq_800:.3f}% < {abq_mile:.3f}%"
          f" -> {'OK' if abq_800 < abq_mile else 'FAIL'}")
    abq_5k = model_predict(params, 4958, 0.95) * 100
    abq_10k = model_predict(params, 4958, 0.98) * 100
    print(f"  5k < 10k @ABQ:     {abq_5k:.3f}% < {abq_10k:.3f}%"
          f" -> {'OK' if abq_5k < abq_10k else 'FAIL'}")

    all_positive = all(
        model_predict(params, elev, aero) > 0
        for _, elev in VENUES
        for event in EVENTS
        for aero in [AEROBIC_FRACTIONS[event]]
    )
    print(f"  All positive:      {'OK' if all_positive else 'FAIL'}")
    print()

    # Write SQL
    sql = format_sql(params)
    print("=" * 70)
    print("SQL OUTPUT")
    print("=" * 70)
    print(sql)

    sql_path = (
        "/Users/ncionelo/Downloads/JOBS/PROJECTS/PACE/sdr"
        "/supabase/migrations/006_sdr_altitude_estimates.sql"
    )
    with open(sql_path, "w") as f:
        f.write(sql + "\n")
    print(f"\nSQL written to: {sql_path}")

    # Constants
    print()
    print("=" * 70)
    print("Constants for py/utils/altitude.py:")
    print("=" * 70)
    print(f"ALPHA = {float(alpha)}")
    print(f"BETA = {float(beta)}")
    print(f"GAMMA = {float(gamma)}")
    print(f"THRESHOLD_FT = {thresh_int}")


if __name__ == "__main__":
    main()
