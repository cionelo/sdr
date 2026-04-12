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
  source_url: string | null
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
  source_url?: string | null
  scraped_at?: string | null
}
