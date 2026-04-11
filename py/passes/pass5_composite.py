"""Pass 5 — SDR Composite Rating.

Aggregates per-race scores into a single SDR per athlete per distance.
Applies decay weighting, confidence regression, and CSI adjustments.

Pipeline position: Pass 4 (SDS) → THIS → Leaderboard output
"""
from sdr.py.models.sdr import RaceSDS, SDRComposite


def compute_composite(
    athlete_id: str,
    event: str,
    race_scores: list[RaceSDS],
    wa_scores: list[float],
    preset: str = "championship_seeding",
) -> SDRComposite:
    """Compute SDR composite for one athlete at one distance.

    Args:
        athlete_id: Athlete identifier.
        event: Canonical event name.
        race_scores: Per-race SDS scores from Pass 4.
        wa_scores: Per-race WA performance scores.
        preset: Config preset name.

    Returns:
        SDRComposite with final rating and confidence.
    """
    raise NotImplementedError("Pass 5 composite implementation pending")
