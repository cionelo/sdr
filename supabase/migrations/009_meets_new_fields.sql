-- SDR: Meets table — additional scraper metadata columns
-- Applied manually via Supabase dashboard 2026-04-11

ALTER TABLE meets
  ADD COLUMN IF NOT EXISTS tfrrs_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url_has_splits BOOLEAN,
  ADD COLUMN IF NOT EXISTS source_url_known_provider BOOLEAN;

-- Events table — provider and division columns added by scraper
-- (already applied by ingestion pipeline)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS division TEXT;
