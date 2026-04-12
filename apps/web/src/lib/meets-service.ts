import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meet, MeetFilters, MeetPayload, MeetEvent, Venue } from './types'

export async function fetchVenues(client: SupabaseClient, query: string): Promise<Venue[]> {
  const { data, error } = await client
    .from('sdr_venues')
    .select('id, city, is_altitude')
    .ilike('city', `%${query}%`)
    .limit(10)

  if (error) throw new Error(error.message)
  return (data || []) as Venue[]
}

export async function fetchMeet(
  client: SupabaseClient,
  id: string,
): Promise<{ meet: Meet; events: MeetEvent[] }> {
  const { data: meet, error: meetError } = await client
    .from('meets')
    .select('*, venue:sdr_venues(id, city, is_altitude)')
    .eq('id', id)
    .single()

  if (meetError) throw new Error(meetError.message)

  const { data: events, error: eventsError } = await client
    .from('events')
    .select('*, results(count)')
    .eq('meet_id', id)
    .order('distance')

  if (eventsError) throw new Error(eventsError.message)

  return { meet: meet as Meet, events: (events || []) as MeetEvent[] }
}

export async function fetchMeets(
  client: SupabaseClient,
  filters: MeetFilters = {},
): Promise<Meet[]> {
  let query = client
    .from('meets')
    .select('*, venue:sdr_venues(id, city, is_altitude), events(count)')

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
  }
  if (filters.season) {
    query = query.eq('season', filters.season)
  }
  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo)
  }
  if (filters.hasScraped === true) {
    query = query.not('scraped_at', 'is', null)
  } else if (filters.hasScraped === false) {
    query = query.is('scraped_at', null)
  }
  if (filters.hasScrapableUrl === true) {
    query = query.or('a_live_url_1_scrapable.eq.true,live_url_2_scrapable.eq.true')
  } else if (filters.hasScrapableUrl === false) {
    query = query.or('a_live_url_1_scrapable.neq.true,live_url_2_scrapable.neq.true')
  }

  const { data, error } = await (query as any).order('date', { ascending: false })

  if (error) throw new Error(error.message)

  let meets = (data || []) as Meet[]

  // isAltitude filtered client-side (Supabase JS v2 doesn't support filtering on joined columns)
  if (filters.isAltitude === true) {
    meets = meets.filter((m) => m.venue?.is_altitude === true)
  } else if (filters.isAltitude === false) {
    meets = meets.filter((m) => !m.venue?.is_altitude)
  }

  return meets
}

export async function createMeet(client: SupabaseClient, payload: MeetPayload): Promise<Meet> {
  const { data, error } = await client
    .from('meets')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Meet
}

export async function updateMeet(
  client: SupabaseClient,
  id: string,
  patch: Partial<MeetPayload>,
): Promise<Meet> {
  const { data, error } = await client
    .from('meets')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Meet
}
