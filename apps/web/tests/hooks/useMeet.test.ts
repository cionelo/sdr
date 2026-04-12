import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMeet } from '../../src/hooks/useMeet'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))

const meet = {
  id: 'abc', name: 'Big 12 Indoor', date: '2026-02-28',
  location: 'Fayetteville, AR', season: 'indoor' as const,
  venue_id: null, venue: null, indoor: true,
  division: null, timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
  created_at: '2026-01-01', updated_at: null,
}
const events = [{ id: 'e1', meet_id: 'abc', distance: '800m', gender: 'Women', name: null, date: null, location: null, season: null, source_url: null }]

describe('useMeet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads meet and events', async () => {
    vi.mocked(service.fetchMeet).mockResolvedValue({ meet, events })

    const { result } = renderHook(() => useMeet('abc'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.meet?.id).toBe('abc')
    expect(result.current.events).toHaveLength(1)
  })

  it('isDirty is false initially', async () => {
    vi.mocked(service.fetchMeet).mockResolvedValue({ meet, events })

    const { result } = renderHook(() => useMeet('abc'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isDirty).toBe(false)
  })

  it('isDirty becomes true after setPatch', async () => {
    vi.mocked(service.fetchMeet).mockResolvedValue({ meet, events })

    const { result } = renderHook(() => useMeet('abc'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setPatch({ name: 'Changed' }))

    expect(result.current.isDirty).toBe(true)
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(service.fetchMeet).mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useMeet('bad'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error?.message).toBe('Not found')
  })
})
