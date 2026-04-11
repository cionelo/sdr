"""Performance tier definitions based on World Athletics scoring tables."""

from typing import NamedTuple


class TierDef(NamedTuple):
    label: str
    min_points: int
    max_points: int  # use 9999 for unbounded upper
    variance_factor: float  # SDS threshold scaling per tier


# Tier boundaries (cross-distance via WA points)
TIERS = (
    TierDef("S", 1100, 9999, 0.00),
    TierDef("A", 950, 1099, 0.00),
    TierDef("B", 850, 949, 0.12),
    TierDef("C", 750, 849, 0.24),
    TierDef("D", 650, 749, 0.36),
    TierDef("E", 500, 649, 0.48),
)


def tier_for_points(wa_points: int) -> TierDef | None:
    """Return the tier definition for a given WA points score."""
    for tier in TIERS:
        if tier.min_points <= wa_points <= tier.max_points:
            return tier
    return None
