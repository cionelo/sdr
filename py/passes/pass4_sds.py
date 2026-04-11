"""Pass 4 — SDS (Split Deviation Score) Calculation.

Computes per-race pacing quality scores using personalized baseline curves.
Reads normalized splits + athlete profile, writes SDS per race.

Pipeline position: Pass 3 (profiling) → THIS → Pass 5 (composite)
"""
from sdr.py.models.athlete import AthleteProfile
from sdr.py.models.race import NormalizedRace
from sdr.py.models.sdr import RaceSDS


def compute_sds(race: NormalizedRace, profile: AthleteProfile) -> RaceSDS:
    """Compute SDS for a single race.

    Args:
        race: Normalized race with splits.
        profile: Athlete profile with KsA, archetype, tier.

    Returns:
        RaceSDS with score, confidence, and component breakdown.
    """
    raise NotImplementedError("Pass 4 SDS implementation pending")
