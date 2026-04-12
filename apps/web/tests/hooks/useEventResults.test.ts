import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as service from '../../src/lib/meets-service'
import * as supabaseLib from '../../src/lib/supabase'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))

const results = [
  {
    id: 'r1', athlete_id: 'a1', event_id: 'e1', time_s: 120.5,
    normalized_time_s: 121.0, canonical_event: '800m',
    altitude_adjusted: false, altitude_adjustment_pct: null,
    athlete: { id: 'a1', name: 'Jane Doe', team_id: 't1', team: { id: 't1', name: 'Oregon' } },
  },
]

describe('useEventResults', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(service.fetchEventResults).mockResolvedValue(results as any)
  })

  it('returns results after fetch', async () => {
    const { useEventResults } = await import('../../src/hooks/useEventResults')
    const { result } = renderHook(() => useEventResults('e1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.results).toEqual(results)
    expect(result.current.error).toBeNull()
  })

  it('starts with loading true', async () => {
    vi.mocked(service.fetchEventResults).mockReturnValue(new Promise(() => {}))
    const { useEventResults } = await import('../../src/hooks/useEventResults')
    const { result } = renderHook(() => useEventResults('e1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.results).toEqual([])
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(service.fetchEventResults).mockRejectedValue(new Error('fetch failed'))
    const { useEventResults } = await import('../../src/hooks/useEventResults')
    const { result } = renderHook(() => useEventResults('e1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('fetch failed')
    expect(result.current.results).toEqual([])
  })

  it('calls fetchEventResults with the given eventId', async () => {
    const { useEventResults } = await import('../../src/hooks/useEventResults')
    renderHook(() => useEventResults('e42'))
    await waitFor(() => expect(service.fetchEventResults).toHaveBeenCalledWith(expect.anything(), 'e42'))
  })
})
