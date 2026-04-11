"""Athlete profile data model for SDR pipeline."""
from dataclasses import dataclass


@dataclass(frozen=True)
class AthleteProfile:
    """Athlete profile output from Pass 3."""
    athlete_id: str
    sex: str

    # KsA values (None if data unavailable at that distance pair)
    ksa_800_1500: float | None = None
    ksa_1500_5000: float | None = None
    ksa_5000_10000: float | None = None

    # Archetype
    archetype: str = "hybrid"  # "aerobic_dominant" | "anaerobic_dominant" | "hybrid"
    archetype_path: str = "time_pattern_inferred"  # "ksa_derived" | "time_pattern_inferred"
    ksa_confidence: str = "none"  # "full" | "partial" | "minimal" | "none"

    # Tier
    tier: str = "E"
    wa_points: int = 0
    tier_confidence: str = "low"  # "confirmed" | "estimated" | "low"
