-- SDR: Backfill meets from existing events
-- Groups events by (source_url, date) — one meet per unique pair
-- Derives meet name by stripping gender + event suffix from events.name

WITH grouped AS (
  SELECT
    -- Strip " Men[']s <event> [Section N / Final / ...]" or Women variant from end
    TRIM(REGEXP_REPLACE(
      MIN(name),
      '\s+(Men''?s?|Women''?s?)\s+\S+.*$',
      '',
      'i'
    )) AS meet_name,
    date,
    MIN(location) AS location,
    source_url,
    CASE
      WHEN MIN(season) IN ('indoor', 'outdoor', 'xc') THEN MIN(season)
      ELSE NULL
    END AS season,
    BOOL_OR(season = 'indoor') AS indoor
  FROM events
  GROUP BY source_url, date
  HAVING MIN(name) IS NOT NULL
),
inserted AS (
  INSERT INTO meets (name, date, location, source_url, season, indoor)
  SELECT meet_name, date, location, source_url, season, indoor
  FROM grouped
  RETURNING id, source_url, date
)
UPDATE events e
SET meet_id = i.id
FROM inserted i
WHERE e.source_url IS NOT DISTINCT FROM i.source_url
  AND e.date IS NOT DISTINCT FROM i.date;
