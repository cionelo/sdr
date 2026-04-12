import { describe, it, expect, vi } from 'vitest'
import { fetchVenues, fetchMeet, fetchMeets, createMeet, updateMeet } from '../../src/lib/meets-service'
import { makeMockClient, makeMultiTableClient } from '../mocks/supabase'

describe('fetchVenues', () => {
  it('returns venues matching the query', async () => {
    const venues = [{ id: '1', city: 'Boston', is_altitude: false }]
    const mock = makeMockClient(venues)
    mock._chain.limit.mockResolvedValue({ data: venues, error: null })

    const result = await fetchVenues(mock as any, 'bos')

    expect(mock.from).toHaveBeenCalledWith('sdr_venues')
    expect(mock._chain.ilike).toHaveBeenCalledWith('city', '%bos%')
    expect(mock._chain.limit).toHaveBeenCalledWith(10)
    expect(result).toEqual(venues)
  })

  it('returns empty array on empty query', async () => {
    const mock = makeMockClient([])
    mock._chain.limit.mockResolvedValue({ data: [], error: null })

    const result = await fetchVenues(mock as any, '')
    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    const mock = makeMockClient(null, { message: 'DB error' })
    mock._chain.limit.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    await expect(fetchVenues(mock as any, 'bo')).rejects.toThrow('DB error')
  })
})

describe('fetchMeet', () => {
  const meet = {
    id: 'abc',
    name: 'Big 12 Indoor',
    date: '2026-02-28',
    location: 'Fayetteville, AR',
    venue_id: null,
    venue: null,
  }
  const events = [
    { id: 'e1', meet_id: 'abc', distance: '800m', gender: 'Women', results: [{ count: 24 }] },
  ]

  it('returns meet with events', async () => {
    const client = makeMultiTableClient({
      meets: { data: meet, error: null },
      events: { data: events, error: null },
    })

    const result = await fetchMeet(client as any, 'abc')

    expect(result.meet.id).toBe('abc')
    expect(result.events).toHaveLength(1)
    expect(result.events[0].distance).toBe('800m')
  })

  it('throws when meet not found', async () => {
    const client = makeMultiTableClient({
      meets: { data: null, error: { message: 'Not found' } },
      events: { data: [], error: null },
    })

    await expect(fetchMeet(client as any, 'bad-id')).rejects.toThrow('Not found')
  })
})

describe('fetchMeets', () => {
  const meets = [
    {
      id: '1', name: 'Big 12 Indoor', date: '2026-02-28',
      location: 'Fayetteville, AR', season: 'indoor',
      venue: { id: 'v1', city: 'Fayetteville', is_altitude: false },
      events: [{ count: 12 }],
      scraped_at: '2026-03-01T00:00:00Z',
      a_live_url_1_scrapable: true, live_url_2_scrapable: false,
    },
    {
      id: '2', name: null, date: null,
      location: 'Albuquerque, NM', season: 'outdoor',
      venue: { id: 'v2', city: 'Albuquerque', is_altitude: true },
      events: [{ count: 8 }],
      scraped_at: null,
      a_live_url_1_scrapable: false, live_url_2_scrapable: false,
    },
  ]

  it('returns all meets with no filters', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    const result = await fetchMeets(mock as any, {})
    expect(result).toHaveLength(2)
  })

  it('applies isAltitude=true client-side filter', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    const result = await fetchMeets(mock as any, { isAltitude: true })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('applies isAltitude=false client-side filter', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    const result = await fetchMeets(mock as any, { isAltitude: false })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('applies season filter server-side', async () => {
    const indoorMeets = [meets[0]]
    const mock = makeMockClient(indoorMeets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: indoorMeets, error: null })

    const result = await fetchMeets(mock as any, { season: 'indoor' })
    expect(mock._chain.eq).toHaveBeenCalledWith('season', 'indoor')
    expect(result).toHaveLength(1)
  })

  it('applies hasScraped=true filter server-side', async () => {
    const mock = makeMockClient([meets[0]])
    mock._chain.order = vi.fn().mockResolvedValue({ data: [meets[0]], error: null })

    await fetchMeets(mock as any, { hasScraped: true })
    expect(mock._chain.not).toHaveBeenCalledWith('scraped_at', 'is', null)
  })

  it('applies hasScraped=false filter server-side', async () => {
    const mock = makeMockClient([meets[1]])
    mock._chain.order = vi.fn().mockResolvedValue({ data: [meets[1]], error: null })

    await fetchMeets(mock as any, { hasScraped: false })
    expect(mock._chain.is).toHaveBeenCalledWith('scraped_at', null)
  })

  it('applies search filter server-side', async () => {
    const mock = makeMockClient([meets[0]])
    mock._chain.order = vi.fn().mockResolvedValue({ data: [meets[0]], error: null })

    await fetchMeets(mock as any, { search: 'big 12' })
    expect(mock._chain.or).toHaveBeenCalledWith(
      'name.ilike.%big 12%,location.ilike.%big 12%',
    )
  })

  it('applies dateFrom filter server-side', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    await fetchMeets(mock as any, { dateFrom: '2026-03-01' })
    expect(mock._chain.gte).toHaveBeenCalledWith('date', '2026-03-01')
  })

  it('applies dateTo filter server-side', async () => {
    const mock = makeMockClient(meets)
    mock._chain.order = vi.fn().mockResolvedValue({ data: meets, error: null })

    await fetchMeets(mock as any, { dateTo: '2026-03-31' })
    expect(mock._chain.lte).toHaveBeenCalledWith('date', '2026-03-31')
  })

  it('throws on Supabase error', async () => {
    const mock = makeMockClient(null)
    mock._chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } })

    await expect(fetchMeets(mock as any, {})).rejects.toThrow('fail')
  })
})

describe('createMeet', () => {
  it('inserts and returns the new meet', async () => {
    const newMeet = { id: 'new1', name: 'Test Meet', date: '2026-05-01', season: 'outdoor' }
    const mock = makeMockClient(newMeet)
    mock._chain.single.mockResolvedValue({ data: newMeet, error: null })

    const result = await createMeet(mock as any, { name: 'Test Meet', date: '2026-05-01', season: 'outdoor' })

    expect(mock.from).toHaveBeenCalledWith('meets')
    expect(mock._chain.insert).toHaveBeenCalledWith({ name: 'Test Meet', date: '2026-05-01', season: 'outdoor' })
    expect(result.id).toBe('new1')
  })

  it('throws on insert error', async () => {
    const mock = makeMockClient(null)
    mock._chain.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    await expect(createMeet(mock as any, { name: 'Bad' })).rejects.toThrow('insert failed')
  })
})

describe('updateMeet', () => {
  it('patches and returns the updated meet', async () => {
    const updated = { id: 'abc', name: 'Updated Name', date: '2026-02-28' }
    const mock = makeMockClient(updated)
    mock._chain.single.mockResolvedValue({ data: updated, error: null })

    const result = await updateMeet(mock as any, 'abc', { name: 'Updated Name' })

    expect(mock.from).toHaveBeenCalledWith('meets')
    expect(mock._chain.update).toHaveBeenCalledWith({ name: 'Updated Name' })
    expect(mock._chain.eq).toHaveBeenCalledWith('id', 'abc')
    expect(result.name).toBe('Updated Name')
  })

  it('throws on update error', async () => {
    const mock = makeMockClient(null)
    mock._chain.single.mockResolvedValue({ data: null, error: { message: 'update failed' } })

    await expect(updateMeet(mock as any, 'x', { name: 'x' })).rejects.toThrow('update failed')
  })
})
