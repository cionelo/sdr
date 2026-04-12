import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EventResultsPage } from '../../src/pages/EventResultsPage'
import * as useEventResultsHook from '../../src/hooks/useEventResults'
import * as useEventSplitsHook from '../../src/hooks/useEventSplits'
import * as useMeetHook from '../../src/hooks/useMeet'

vi.mock('../../src/hooks/useEventResults')
vi.mock('../../src/hooks/useEventSplits')
vi.mock('../../src/hooks/useMeet')

const event = {
  id: 'e1', meet_id: 'abc', name: "Women's 800m", date: '2026-02-28',
  gender: 'Women', distance: '800m', location: null, season: 'indoor',
  source_url: null, provider: 'TFRRS', division: 'D1',
}

const results = [
  {
    id: 'r1', athlete_id: 'a1', event_id: 'e1', time_s: 120.5,
    normalized_time_s: 121.0, canonical_event: '800m',
    altitude_adjusted: false, altitude_adjustment_pct: null,
    athlete: { id: 'a1', name: 'Jane Doe', team_id: 't1', team: { id: 't1', name: 'Oregon' } },
  },
  {
    id: 'r2', athlete_id: 'a2', event_id: 'e1', time_s: 121.3,
    normalized_time_s: null, canonical_event: '800m',
    altitude_adjusted: false, altitude_adjustment_pct: null,
    athlete: { id: 'a2', name: 'Sarah Smith', team_id: 't2', team: { id: 't2', name: 'Stanford' } },
  },
]

const splits = [
  { id: 's1', result_id: 'r1', distance_m: 400, time_s: 60.1, split_s: 60.1, label: '400m' },
]

const meet = {
  id: 'abc', name: 'Big 12 Indoor', date: '2026-02-28',
  location: null, season: 'indoor', venue_id: null, venue: null,
  indoor: true, division: 'D1', timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, tfrrs_id: null, source_url: null,
  source_url_has_splits: null, source_url_known_provider: null,
  scraped_at: null, created_at: '2026-01-01', updated_at: null,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/meets/abc/events/e1']}>
      <Routes>
        <Route path="/meets/:id/events/:eventId" element={<EventResultsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventResultsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useEventResultsHook.useEventResults).mockReturnValue({
      results, loading: false, error: null, refetch: vi.fn(),
    })
    vi.mocked(useEventSplitsHook.useEventSplits).mockReturnValue({
      splits: [], loading: false, error: null, refetch: vi.fn(),
    })
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events: [event as any], patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: null, refetch: vi.fn(),
    })
  })

  it('renders event header with distance and gender', () => {
    renderPage()
    expect(screen.getByText('800m')).toBeInTheDocument()
    expect(screen.getByText(/women/i)).toBeInTheDocument()
  })

  it('renders results table with athlete names', () => {
    renderPage()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Sarah Smith')).toBeInTheDocument()
  })

  it('renders team names', () => {
    renderPage()
    expect(screen.getByText('Oregon')).toBeInTheDocument()
    expect(screen.getByText('Stanford')).toBeInTheDocument()
  })

  it('renders place column (1, 2, ...)', () => {
    renderPage()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('renders time_s values', () => {
    renderPage()
    expect(screen.getByText('120.50')).toBeInTheDocument()
    expect(screen.getByText('121.30')).toBeInTheDocument()
  })

  it('renders SDR normalized time when present', () => {
    renderPage()
    expect(screen.getByText('121.00')).toBeInTheDocument()
  })

  it('renders back link to meet detail', () => {
    renderPage()
    const back = screen.getByRole('link', { name: /meet/i })
    expect(back).toHaveAttribute('href', '/meets/abc')
  })

  it('shows loading state', () => {
    vi.mocked(useEventResultsHook.useEventResults).mockReturnValue({
      results: [], loading: true, error: null, refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useEventResultsHook.useEventResults).mockReturnValue({
      results: [], loading: false, error: new Error('load failed'), refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/load failed/i)).toBeInTheDocument()
  })

  it('shows splits toggle button per result', () => {
    vi.mocked(useEventResultsHook.useEventResults).mockReturnValue({
      results: [results[0]], loading: false, error: null, refetch: vi.fn(),
    })
    vi.mocked(useEventSplitsHook.useEventSplits).mockReturnValue({
      splits, loading: false, error: null, refetch: vi.fn(),
    })
    renderPage()
    const toggle = screen.getByRole('button', { name: /splits/i })
    expect(toggle).toBeInTheDocument()
  })

  it('expands splits panel on toggle click', async () => {
    vi.mocked(useEventResultsHook.useEventResults).mockReturnValue({
      results: [results[0]], loading: false, error: null, refetch: vi.fn(),
    })
    vi.mocked(useEventSplitsHook.useEventSplits).mockReturnValue({
      splits, loading: false, error: null, refetch: vi.fn(),
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /splits/i }))
    await waitFor(() => expect(screen.getByText('400m')).toBeInTheDocument())
  })

  it('shows empty state when no results', () => {
    vi.mocked(useEventResultsHook.useEventResults).mockReturnValue({
      results: [], loading: false, error: null, refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })
})
