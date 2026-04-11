-- SDR: Altitude venue database
-- Referenced by altitude_adjustments and race normalization pipeline

CREATE TABLE IF NOT EXISTS sdr_venues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    elevation_ft INT NOT NULL,
    is_altitude BOOLEAN GENERATED ALWAYS AS (elevation_ft >= 3000) STORED,
    track_surface TEXT DEFAULT 'outdoor',
    tfrrs_venue_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Altitude adjustment percentages per venue per event
CREATE TABLE IF NOT EXISTS sdr_altitude_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id TEXT NOT NULL REFERENCES sdr_venues(id),
    event_distance TEXT NOT NULL,
    adjustment_pct NUMERIC(8,6) NOT NULL,
    source TEXT NOT NULL DEFAULT 'tfrrs_sampled',
    confidence TEXT NOT NULL DEFAULT 'estimated',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(venue_id, event_distance)
);

-- RLS
ALTER TABLE sdr_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdr_altitude_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON sdr_venues FOR SELECT USING (true);
CREATE POLICY "Public read" ON sdr_altitude_adjustments FOR SELECT USING (true);
