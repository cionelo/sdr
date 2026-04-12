import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))

const splits = [
  { id: 's1', result_id: 'r1', distance_m: 400, time_s: 60.1, split_s: 60.1, label: '400m' },
  { id: 's2', result_id: 'r1', distance_m: 800, time_s: 120.5, split_s: 60.4, label: '800m' },
]

describe('useEventSplits', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(service.fetchResultSplits).mockResolvedValue(splits as any)
  })

  it('returns splits after fetch', async () => {
    const { useEventSplits } = await import('../../src/hooks/useEventSplits')
    const { result } = renderHook(() => useEventSplits('r1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.splits).toEqual(splits)
    expect(result.current.error).toBeNull()
  })

  it('starts with loading true and empty splits', async () => {
    vi.mocked(service.fetchResultSplits).mockReturnValue(new Promise(() => {}))
    const { useEventSplits } = await import('../../src/hooks/useEventSplits')
    const { result } = renderHook(() => useEventSplits('r1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.splits).toEqual([])
  })

  it('sets error on failure', async () => {
    vi.mocked(service.fetchResultSplits).mockRejectedValue(new Error('splits failed'))
    const { useEventSplits } = await import('../../src/hooks/useEventSplits')
    const { result } = renderHook(() => useEventSplits('r1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('splits failed')
  })

  it('calls fetchResultSplits with the given resultId', async () => {
    const { useEventSplits } = await import('../../src/hooks/useEventSplits')
    renderHook(() => useEventSplits('r99'))
    await waitFor(() => expect(service.fetchResultSplits).toHaveBeenCalledWith(expect.anything(), 'r99'))
  })
})
