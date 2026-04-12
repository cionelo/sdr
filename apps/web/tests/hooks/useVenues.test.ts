import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVenues } from '../../src/hooks/useVenues'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))

describe('useVenues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns venues for a non-empty query', async () => {
    const venues = [{ id: '1', city: 'Boston', is_altitude: false }]
    vi.mocked(service.fetchVenues).mockResolvedValue(venues)

    const { result } = renderHook(() => useVenues('bos'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.venues).toEqual(venues)
  })

  it('returns empty array for empty query without calling service', async () => {
    const { result } = renderHook(() => useVenues(''))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.venues).toEqual([])
    expect(service.fetchVenues).not.toHaveBeenCalled()
  })

  it('starts with loading=true for non-empty query', () => {
    vi.mocked(service.fetchVenues).mockResolvedValue([])
    const { result } = renderHook(() => useVenues('bo'))
    expect(result.current.loading).toBe(true)
  })

  it('returns empty array on fetch error', async () => {
    vi.mocked(service.fetchVenues).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useVenues('bos'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.venues).toEqual([])
  })
})
