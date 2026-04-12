-- SDR: Meets table — one row per competition event
-- Groups individual race events under a shared meet record

CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE,
  location TEXT,
  venue_id TEXT REFERENCES sdr_venues(id),
  division TEXT,
  season TEXT CHECK (season IN ('indoor', 'outdoor', 'xc')),
  indoor BOOLEAN DEFAULT false,
  timing_company TEXT,
  a_live_url_1 TEXT,
  a_live_url_1_scrapable BOOLEAN DEFAULT false,
  live_url_2 TEXT,
  live_url_2_scrapable BOOLEAN DEFAULT false,
  tfrrs_url TEXT,
  source_url TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS meet_id UUID REFERENCES meets(id);

ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON meets FOR SELECT USING (true);
