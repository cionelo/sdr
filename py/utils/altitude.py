"""Altitude adjustment utilities for PACE SDR.

Implements the parametric altitude model fitted from NCAA conversion data.
See: sdr/algorithm design/sdr_algo_altititude-conv_normalization_spec_v1.md
See: sdr/py/scripts/fit_altitude_model.py for the fitting procedure.

Model: adjustment_pct = ALPHA * (aerobic_fraction ^ BETA) * (dh ^ GAMMA)
  where dh = max(0, elevation_ft - THRESHOLD_FT) / 1000

Fitted from 4 NCAA data points:
  - ABQ (4958 ft)    800m:  0.558%  (ncaa_published, verified)
  - Texas Tech (3195 ft) Mile: 1.153%  (ncaa_published, verified)
  - ABQ (4958 ft)    Mile: ~1.867%  (spec_estimated)
  - Adams State (7544 ft) Mile: 4.217%  (ncaa_published, verified)

Max relative error on verified data points: <4%.
"""

from __future__ import annotations

import math

# --- Fitted model parameters ---
# See fit_altitude_model.py for derivation
ALPHA = 0.001884417293292896
BETA = 4.249429246098758
GAMMA = 1.8245217039908415
THRESHOLD_FT = -1000  # Mathematical threshold from fit (not a physical cutoff)

# SDR only applies altitude adjustments at venues >= 3000 ft
# (matches sdr_venues.is_altitude column definition)
MIN_ALTITUDE_FT = 3000

# Aerobic fractions by event (exercise physiology consensus)
AEROBIC_FRACTIONS: dict[str, float] = {
    "800m": 0.60,
    "1500m": 0.80,
    "mile": 0.82,
    "3000m": 0.90,
    "3000m_steeple": 0.90,
    "5000m": 0.95,
    "10000m": 0.98,
}


def compute_altitude_adjustment(elevation_ft: int, event: str) -> float:
    """Compute the altitude adjustment percentage for a given venue and event.

    Returns 0.0 for elevations below 3000 ft (non-altitude venues).
    Returns the adjustment as a decimal (e.g., 0.00558 for 0.558%).

    Args:
        elevation_ft: Venue elevation in feet above sea level.
        event: Event distance string, one of the keys in AEROBIC_FRACTIONS.

    Raises:
        ValueError: If the event is not recognized.
    """
    if elevation_ft < MIN_ALTITUDE_FT:
        return 0.0

    aerobic_fraction = AEROBIC_FRACTIONS.get(event)
    if aerobic_fraction is None:
        raise ValueError(
            f"Unknown event '{event}'. "
            f"Valid events: {sorted(AEROBIC_FRACTIONS.keys())}"
        )

    return _compute_raw(elevation_ft, aerobic_fraction)


def compute_altitude_adjustment_raw(
    elevation_ft: int, aerobic_fraction: float
) -> float:
    """Compute adjustment using a raw aerobic fraction value.

    Useful for custom events or interpolation between known fractions.
    Returns 0.0 for elevations below 3000 ft.
    Returns the adjustment as a decimal.

    Args:
        elevation_ft: Venue elevation in feet above sea level.
        aerobic_fraction: Aerobic contribution fraction (0.0 to 1.0).
    """
    if elevation_ft < MIN_ALTITUDE_FT:
        return 0.0

    if not 0.0 < aerobic_fraction <= 1.0:
        raise ValueError(
            f"aerobic_fraction must be in (0, 1], got {aerobic_fraction}"
        )

    return _compute_raw(elevation_ft, aerobic_fraction)


def _compute_raw(elevation_ft: float, aerobic_fraction: float) -> float:
    """Core model computation (no guards)."""
    dh = max(0.0, elevation_ft - THRESHOLD_FT) / 1000.0
    if dh <= 0:
        return 0.0
    return ALPHA * (aerobic_fraction ** BETA) * (dh ** GAMMA)


def adjust_time(time_s: float, elevation_ft: int, event: str) -> float:
    """Convert an altitude time to sea-level equivalent.

    Subtracts the estimated altitude benefit from the raw time.
    Returns the adjusted time in seconds.

    Args:
        time_s: Raw race time in seconds.
        elevation_ft: Venue elevation in feet.
        event: Event distance string.
    """
    adj = compute_altitude_adjustment(elevation_ft, event)
    return time_s * (1 - adj)
