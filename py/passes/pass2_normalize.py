"""Pass 2 — Performance Normalization.

Converts raw finish times to sea-level, canonical-event equivalents.
Reads raw data from Supabase, writes normalized times alongside raw times.

Pipeline position: Pass 1 (ingestion) → THIS → Pass 3 (profiling)

Two normalization layers applied in order:
  1. Altitude adjustment: raw × (1 − pct) for venues ≥3,000 ft
  2. Event conversion: Mile → 1500m × 0.9259, ceil to 0.01s (NCAA)
"""
import math

from sdr.py.models.race import RawRace, NormalizedRace
from sdr.py.utils.field_mapping import pace_distance_to_canonical, needs_event_conversion
from sdr.py.utils.time_convert import ceil_hundredths

# NCAA published Mile → 1500m conversion factor
MILE_TO_1500M: float = 0.9259

# Map PACE distance strings to sdr_altitude_adjustments.event_distance keys.
# These match AEROBIC_FRACTIONS in altitude.py. Mile stays "mile" (not "1500m")
# because the altitude effect differs by physical distance.
_PACE_TO_ALTITUDE_KEY: dict[str, str] = {
    "800m": "800m", "800": "800m",
    "1500m": "1500m", "1500": "1500m",
    "Mile": "mile", "1 Mile": "mile", "mile": "mile",
    "3000m": "3000m", "3000": "3000m",
    "3000m Steeplechase": "3000m_steeple", "3000m SC": "3000m_steeple",
    "3000m_steeple": "3000m_steeple",
    "5000m": "5000m", "5000": "5000m", "5K": "5000m",
    "10000m": "10000m", "10000": "10000m", "10K": "10000m", "10,000m": "10000m",
}


def normalize_race(race: RawRace, venue_adjustments: dict[str, float]) -> NormalizedRace:
    """Normalize a single race: altitude adjustment then event conversion.

    Args:
        race: Raw race record from ingestion. race.venue_id identifies the venue.
        venue_adjustments: Dict mapping altitude event key → adjustment_pct for
            the venue where this race was held. Empty dict = sea-level, no adjustment.
            Keys use AEROBIC_FRACTIONS naming: "800m", "mile", "5000m", etc.

    Returns:
        NormalizedRace with sea-level, canonical-event equivalent times.
        Raw time is always preserved unchanged.
    """
    canonical = pace_distance_to_canonical(race.event)

    # ── Layer 1: altitude adjustment ─────────────────────────────────────────
    altitude_key = _PACE_TO_ALTITUDE_KEY.get(race.event.strip())
    adjustment_pct = venue_adjustments.get(altitude_key, 0.0) if altitude_key else 0.0
    altitude_adjusted = adjustment_pct > 0.0

    working_time = race.finish_time_sec * (1.0 - adjustment_pct)

    # ── Layer 2: event conversion (Mile → 1500m) ──────────────────────────────
    event_converted = False
    conversion_factor = None

    if needs_event_conversion(race.event):
        working_time = ceil_hundredths(working_time * MILE_TO_1500M)
        event_converted = True
        conversion_factor = MILE_TO_1500M

    # ── Splits: apply altitude factor if present ──────────────────────────────
    splits_normalized = None
    if altitude_adjusted and race.splits_sec:
        splits_normalized = tuple(s * (1.0 - adjustment_pct) for s in race.splits_sec)

    return NormalizedRace(
        result_id=race.result_id,
        athlete_id=race.athlete_id,
        raw_event=race.event,
        canonical_event=canonical if canonical is not None else race.event,
        raw_time_sec=race.finish_time_sec,
        normalized_time_sec=working_time,
        splits_raw=race.splits_sec,
        splits_normalized=splits_normalized,
        race_date=race.race_date,
        meet_id=race.meet_id,
        altitude_adjusted=altitude_adjusted,
        altitude_adjustment_pct=adjustment_pct if altitude_adjusted else None,
        event_converted=event_converted,
        event_conversion_factor=conversion_factor,
        venue_id=race.venue_id,
        gender=race.gender,
    )


def normalize_batch(races: list[RawRace], venue_adjustments: dict[str, float]) -> list[NormalizedRace]:
    """Normalize a batch of races using the same venue adjustments."""
    return [normalize_race(r, venue_adjustments) for r in races]
