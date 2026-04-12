import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MeetsList } from '../../src/pages/MeetsList'
import * as useMeetsHook from '../../src/hooks/useMeets'
import * as serviceModule from '../../src/lib/meets-service'

vi.mock('../../src/hooks/useMeets')
vi.mock('../../src/lib/meets-service')
vi.mock('../../src/hooks/useVenues', () => ({
  useVenues: () => ({ venues: [], loading: false }),
}))
vi.mock('../../src/components/FilterBar', () => ({
  FilterBar: () => null,
}))

const meets = [
  {
    id: '1', name: 'Big 12 Indoor', date: '2026-02-28',
    location: 'Fayetteville, AR', season: 'indoor', division: 'D1',
    venue: { id: 'v1', city: 'Fayetteville', is_altitude: false },
    events: [{ count: 12 }], scraped_at: '2026-03-01T00:00:00Z',
    a_live_url_1: null, a_live_url_1_scrapable: null,
    live_url_2: null, live_url_2_scrapable: null,
  },
  {
    id: '2', name: null, date: null,
    location: 'Albuquerque, NM', season: 'outdoor', division: null,
    venue: { id: 'v2', city: 'Albuquerque', is_altitude: true },
    events: [{ count: 0 }], scraped_at: null,
    a_live_url_1: null, a_live_url_1_scrapable: null,
    live_url_2: null, live_url_2_scrapable: null,
  },
]

describe('MeetsList', () => {
  beforeEach(() => {
    vi.mocked(useMeetsHook.useMeets).mockReturnValue({
      meets: meets as any,
      filters: {},
      setFilters: vi.fn(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renders meet names in the table', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('Big 12 Indoor')).toBeInTheDocument()
  })

  it('shows ⌀ flag for null name', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    const nullFlags = screen.getAllByText('⌀')
    expect(nullFlags.length).toBeGreaterThan(0)
  })

  it('shows altitude badge for altitude venues', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText(/ALT/i)).toBeInTheDocument()
  })

  it('shows scraped checkmark for meets with scraped_at', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows — for meets without scraped_at', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows ADD MEET button', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText(/add meet/i)).toBeInTheDocument()
  })

  it('shows event count', () => {
    render(<MemoryRouter><MeetsList /></MemoryRouter>)
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})
