-- SDR: Athlete profile table (Pass 3 output)
-- Stores KsA values, archetype classification, and tier assignment.
-- One row per athlete. Updated each time Pass 3 runs.

CREATE TABLE IF NOT EXISTS sdr_athlete_profiles (
    athlete_id UUID PRIMARY KEY REFERENCES athletes(id),

    -- KsA values (NULL if insufficient data at that distance pair)
    ksa_800_1500 NUMERIC(6,4),
    ksa_1500_5000 NUMERIC(6,4),
    ksa_5000_10000 NUMERIC(6,4),

    -- Archetype
    archetype TEXT NOT NULL DEFAULT 'hybrid'
        CHECK (archetype IN ('aerobic_dominant', 'anaerobic_dominant', 'hybrid')),
    archetype_path TEXT NOT NULL DEFAULT 'time_pattern_inferred'
        CHECK (archetype_path IN ('ksa_derived', 'time_pattern_inferred')),
    ksa_confidence TEXT NOT NULL DEFAULT 'none'
        CHECK (ksa_confidence IN ('full', 'partial', 'minimal', 'none')),

    -- Tier
    tier TEXT NOT NULL DEFAULT 'E'
        CHECK (tier IN ('S', 'A', 'B', 'C', 'D', 'E')),
    wa_points INT DEFAULT 0,
    tier_confidence TEXT NOT NULL DEFAULT 'low'
        CHECK (tier_confidence IN ('confirmed', 'estimated', 'low')),

    -- Metadata
    profile_version TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sdr_athlete_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON sdr_athlete_profiles FOR SELECT USING (true);
