export type Season = 'indoor' | 'outdoor' | 'xc'

export interface Venue {
  id: string
  city: string
  is_altitude: boolean
}

export interface MeetEvent {
  id: string
  meet_id: string
  name: string | null
  date: string | null
  location: string | null
  gender: string | null
  distance: string | null
  season: string | null
  source_url: string | null
  provider: string | null
  division: string | null
  results?: { count: number }[]
}

export interface Meet {
  id: string
  name: string | null
  date: string | null
  location: string | null
  venue_id: string | null
  division: string | null
  season: Season | null
  indoor: boolean | null
  timing_company: string | null
  a_live_url_1: string | null
  a_live_url_1_scrapable: boolean | null
  live_url_2: string | null
  live_url_2_scrapable: boolean | null
  tfrrs_url: string | null
  tfrrs_id: string | null
  source_url: string | null
  source_url_has_splits: boolean | null
  source_url_known_provider: boolean | null
  scraped_at: string | null
  created_at: string
  updated_at: string | null
  // joined
  venue?: Venue | null
  events?: { count: number }[]
}

export interface MeetFilters {
  search?: string
  season?: Season
  dateFrom?: string
  dateTo?: string
  isAltitude?: boolean
  hasScrapableUrl?: boolean
  hasScraped?: boolean
}

export interface Athlete {
  id: string
  name: string | null
  team_id: string | null
  team?: Team | null
}

export interface Team {
  id: string
  name: string | null
}

export interface Result {
  id: string
  athlete_id: string | null
  event_id: string | null
  time_s: number | null
  // SDR columns
  normalized_time_s: number | null
  canonical_event: string | null
  altitude_adjusted: boolean | null
  altitude_adjustment_pct: number | null
  // joined
  athlete?: Athlete | null
}

export interface Split {
  id: string
  result_id: string
  distance_m: number | null
  elapsed_s: number | null
  lap_s: number | null
  label: string | null
}

export interface MeetPayload {
  name?: string | null
  date?: string | null
  location?: string | null
  venue_id?: string | null
  division?: string | null
  season?: Season | null
  indoor?: boolean | null
  timing_company?: string | null
  a_live_url_1?: string | null
  a_live_url_1_scrapable?: boolean | null
  live_url_2?: string | null
  live_url_2_scrapable?: boolean | null
  tfrrs_url?: string | null
  tfrrs_id?: string | null
  source_url?: string | null
  source_url_has_splits?: boolean | null
  source_url_known_provider?: boolean | null
  scraped_at?: string | null
}
