-- SDR: Per-race SDS scores (Pass 4 output)
CREATE TABLE IF NOT EXISTS sdr_race_sds (
    result_id UUID PRIMARY KEY REFERENCES results(id),

    sds_score NUMERIC(8,4),
    sds_confidence TEXT NOT NULL DEFAULT 'insufficient'
        CHECK (sds_confidence IN ('high', 'medium', 'low', 'insufficient')),
    baseline_source TEXT NOT NULL DEFAULT 'theoretical'
        CHECK (baseline_source IN ('empirical_calibrated', 'empirical_bootstrap', 'theoretical')),

    closing_velocity_index NUMERIC(6,4),
    execution_delta NUMERIC(8,4),
    per_lap_deviation NUMERIC(8,6)[],
    fade_penalty_applied BOOLEAN DEFAULT FALSE,
    ksa_archetype_weight_used NUMERIC(6,4),

    -- CSI (Competition Strength Index)
    csi_field_strength NUMERIC(8,2),
    csi_expected_field_strength NUMERIC(8,2),
    csi_adjustment NUMERIC(8,6),
    csi_confidence TEXT DEFAULT 'tier_fallback'
        CHECK (csi_confidence IN ('empirical', 'tier_fallback')),

    -- Race type context (ingested now, used later)
    race_type TEXT DEFAULT 'unknown'
        CHECK (race_type IN ('invitational', 'championship', 'conference_championship', 'heat', 'time_trial', 'unknown')),

    score_version TEXT,
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- SDR: Composite athlete rating (Pass 5 output)
-- One row per athlete per canonical event.
CREATE TABLE IF NOT EXISTS sdr_composite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    event TEXT NOT NULL,

    sdr_score NUMERIC(8,2),
    sdr_confidence TEXT NOT NULL DEFAULT 'provisional'
        CHECK (sdr_confidence IN ('high', 'moderate', 'limited', 'provisional')),
    sdr_race_count INT DEFAULT 0,
    aggregation_method TEXT NOT NULL DEFAULT 'decay_weighted'
        CHECK (aggregation_method IN ('pr_only', 'best_of_n', 'decay_weighted')),
    preset TEXT NOT NULL DEFAULT 'championship_seeding',

    wa_performance_component NUMERIC(8,2),
    sds_component NUMERIC(8,2),
    csi_component NUMERIC(8,2),
    confidence_regression_applied BOOLEAN DEFAULT FALSE,
    confidence_regression_factor NUMERIC(6,4),

    composite_version TEXT,
    computed_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(athlete_id, event, preset)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sdr_composite_athlete ON sdr_composite(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sdr_composite_event ON sdr_composite(event);
CREATE INDEX IF NOT EXISTS idx_sdr_composite_score ON sdr_composite(sdr_score DESC);

-- RLS
ALTER TABLE sdr_race_sds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_composite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON sdr_race_sds FOR SELECT USING (true);
CREATE POLICY "Public read" ON sdr_composite FOR SELECT USING (true);
