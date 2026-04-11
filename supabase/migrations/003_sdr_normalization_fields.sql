-- SDR: Add normalization fields to existing results table
-- These columns are written by SDR Pass 2 (normalization) only.
-- Raw ingestion data (time_s, etc.) is NEVER modified by SDR.

ALTER TABLE results ADD COLUMN IF NOT EXISTS venue_id TEXT REFERENCES sdr_venues(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS normalized_time_s NUMERIC;
ALTER TABLE results ADD COLUMN IF NOT EXISTS canonical_event TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS altitude_adjusted BOOLEAN DEFAULT FALSE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS altitude_adjustment_pct NUMERIC(8,6);
ALTER TABLE results ADD COLUMN IF NOT EXISTS event_converted BOOLEAN DEFAULT FALSE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS event_conversion_factor NUMERIC(8,4);
ALTER TABLE results ADD COLUMN IF NOT EXISTS normalization_version TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS normalization_pass_at TIMESTAMPTZ;
