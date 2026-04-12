import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useMeets } from '../../src/hooks/useMeets'
import * as service from '../../src/lib/meets-service'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/lib/supabase', () => ({ supabase: {} }))

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(MemoryRouter, { initialEntries: ['/meets'] }, children)

const meets = [
  { id: '1', name: 'Big 12 Indoor', date: '2026-02-28', venue: null, events: [{ count: 4 }], scraped_at: null },
]

describe('useMeets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches meets on mount', async () => {
    vi.mocked(service.fetchMeets).mockResolvedValue(meets as any)

    const { result } = renderHook(() => useMeets(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.meets).toHaveLength(1)
  })

  it('refetch re-calls the service', async () => {
    vi.mocked(service.fetchMeets).mockResolvedValue(meets as any)

    const { result } = renderHook(() => useMeets(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.refetch())
    expect(service.fetchMeets).toHaveBeenCalledTimes(2)
  })

  it('sets error on failure', async () => {
    vi.mocked(service.fetchMeets).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useMeets(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error?.message).toBe('network error')
  })

  it('setFilters updates search params', async () => {
    vi.mocked(service.fetchMeets).mockResolvedValue(meets as any)

    const { result } = renderHook(() => useMeets(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setFilters({ season: 'indoor' }))
    // After setting filters, another fetch should be triggered
    await waitFor(() => expect(service.fetchMeets).toHaveBeenCalledTimes(2))
  })

  it('setFilters with existing key removes it from params', async () => {
    vi.mocked(service.fetchMeets).mockResolvedValue(meets as any)

    // Start with season=indoor in params
    const wrapperWithParams = ({ children }: { children: React.ReactNode }) =>
      createElement(MemoryRouter, { initialEntries: ['/meets?season=indoor'] }, children)

    const { result } = renderHook(() => useMeets(), { wrapper: wrapperWithParams })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Clear the season filter
    act(() => result.current.setFilters({ season: undefined }))
    await waitFor(() => expect(service.fetchMeets).toHaveBeenCalledTimes(2))
  })
})
