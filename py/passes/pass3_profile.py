"""Pass 3 — Athlete Profiling.

Computes KsA coefficients, archetype classification, WA scoring, and tier assignment.
Reads normalized times from Supabase, writes athlete profile.

Pipeline position: Pass 2 (normalization) → THIS → Pass 4 (SDS)
"""
from sdr.py.models.athlete import AthleteProfile


def compute_ksa(athlete_id: str, normalized_prs: dict[str, float], sex: str) -> dict:
    """Compute KsA values for adjacent distance pairs.

    Args:
        athlete_id: Athlete identifier.
        normalized_prs: Dict of event -> best normalized time in seconds.
        sex: 'male' or 'female'.

    Returns:
        Dict with ksa values and archetype classification.
    """
    raise NotImplementedError("Pass 3 KsA implementation pending")


def build_profile(athlete_id: str, normalized_prs: dict[str, float], sex: str) -> AthleteProfile:
    """Build complete athlete profile from normalized PRs."""
    raise NotImplementedError("Pass 3 profile implementation pending")
