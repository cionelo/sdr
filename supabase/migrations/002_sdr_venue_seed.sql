-- SDR: Seed known NCAA altitude venues (≥3,000 ft)
-- Source: TFRRS converter dropdown + university athletics websites

INSERT INTO sdr_venues (id, name, city, state, elevation_ft) VALUES
('texas_tech', 'Texas Tech', 'Lubbock', 'TX', 3195),
('south_dakota_mines', 'South Dakota Mines', 'Rapid City', 'SD', 3202),
('montana', 'Montana', 'Missoula', 'MT', 3209),
('chadron_state', 'Chadron State', 'Chadron', 'NE', 3369),
('black_hills_state', 'Black Hills State', 'Spearfish', 'SD', 3640),
('utep', 'UTEP', 'El Paso', 'TX', 3740),
('new_mexico_state', 'New Mexico State', 'Las Cruces', 'NM', 3896),
('utah', 'Utah', 'Salt Lake City', 'UT', 4226),
('weber_state', 'Weber State', 'Ogden', 'UT', 4299),
('idaho_state', 'Idaho State', 'Pocatello', 'ID', 4462),
('utah_state', 'Utah State', 'Logan', 'UT', 4535),
('byu', 'BYU', 'Provo', 'UT', 4551),
('montana_state', 'Montana State', 'Bozeman', 'MT', 4793),
('unm_albuquerque', 'New Mexico (UNM)', 'Albuquerque', 'NM', 4958),
('colorado_state', 'Colorado State', 'Fort Collins', 'CO', 5003),
('colorado_cu', 'Colorado (CU)', 'Boulder', 'CO', 5328),
('colorado_mines', 'Colorado Mines', 'Golden', 'CO', 5675),
('air_force', 'Air Force', 'Colorado Springs', 'CO', 6621),
('northern_arizona', 'Northern Arizona', 'Flagstaff', 'AZ', 6909),
('wyoming', 'Wyoming', 'Laramie', 'WY', 7220),
('adams_state', 'Adams State', 'Alamosa', 'CO', 7544),
('western_state', 'Western State', 'Gunnison', 'CO', 7703)
ON CONFLICT (id) DO NOTHING;

-- Seed verified altitude adjustment for ABQ 800m
INSERT INTO sdr_altitude_adjustments (venue_id, event_distance, adjustment_pct, source, confidence) VALUES
('unm_albuquerque', '800m', 0.00558, 'ncaa_published', 'verified')
ON CONFLICT (venue_id, event_distance) DO NOTHING;
