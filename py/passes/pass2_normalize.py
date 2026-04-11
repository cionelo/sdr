"""Pass 2 — Performance Normalization.

Converts raw finish times to sea-level, canonical-event equivalents.
Reads raw data from Supabase, writes normalized times alongside raw times.

Pipeline position: Pass 1 (ingestion) → THIS → Pass 3 (profiling)
"""
from sdr.py.models.race import RawRace, NormalizedRace


def normalize_race(race: RawRace, venue_adjustments: dict) -> NormalizedRace:
    """Normalize a single race: event conversion + altitude adjustment.

    Args:
        race: Raw race record from ingestion.
        venue_adjustments: Dict of (venue_id, event) -> adjustment_pct.

    Returns:
        NormalizedRace with sea-level equivalent times.
    """
    raise NotImplementedError("Pass 2 implementation pending")


def normalize_batch(races: list[RawRace], venue_adjustments: dict) -> list[NormalizedRace]:
    """Normalize a batch of races."""
    return [normalize_race(r, venue_adjustments) for r in races]
