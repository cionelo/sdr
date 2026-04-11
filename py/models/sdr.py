"""SDR composite output data model."""
from dataclasses import dataclass


@dataclass(frozen=True)
class RaceSDS:
    """Per-race SDS output from Pass 4."""
    result_id: str
    sds_score: float
    sds_confidence: str  # "high" | "medium" | "low" | "insufficient"
    baseline_source: str  # "empirical_calibrated" | "empirical_bootstrap" | "theoretical"
    closing_velocity_index: float | None = None
    execution_delta: float | None = None
    per_lap_deviation: tuple[float, ...] = ()
    fade_penalty_applied: bool = False
    ksa_archetype_weight_used: float = 0.0


@dataclass(frozen=True)
class SDRComposite:
    """Final SDR composite output from Pass 5."""
    athlete_id: str
    event: str  # canonical event
    sdr_score: float
    sdr_confidence: str  # "high" | "moderate" | "limited" | "provisional"
    sdr_race_count: int
    aggregation_method: str  # "pr_only" | "best_of_n" | "decay_weighted"
    preset: str  # "championship_seeding" | "season_strength" | "raw_performance" | "custom"
    wa_performance_component: float = 0.0
    sds_component: float = 0.0
    csi_component: float = 0.0
    confidence_regression_applied: bool = False
