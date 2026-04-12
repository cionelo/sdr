"""Race result data model for SDR pipeline."""
from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class RawRace:
    """Immutable raw race record as ingested by /pace/."""
    result_id: str
    athlete_id: str
    event: str
    finish_time_sec: float
    splits_sec: tuple[float, ...]
    race_date: date
    meet_id: str
    venue_name: str | None = None
    venue_elevation_ft: int | None = None
    venue_id: str | None = None
    gender: str = ""
    data_quality: str = "verified_fat"
    timing_method: str = "FAT"
    split_completeness: str = "full"


@dataclass(frozen=True)
class NormalizedRace:
    """Race record after Pass 2 normalization."""
    result_id: str
    athlete_id: str
    raw_event: str
    canonical_event: str
    raw_time_sec: float
    normalized_time_sec: float
    splits_raw: tuple[float, ...]
    splits_normalized: tuple[float, ...] | None
    race_date: date
    meet_id: str
    altitude_adjusted: bool = False
    altitude_adjustment_pct: float | None = None
    event_converted: bool = False
    event_conversion_factor: float | None = None
    venue_id: str | None = None
    gender: str = ""
