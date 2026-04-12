import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MeetDetail } from '../../src/pages/MeetDetail'
import * as useMeetHook from '../../src/hooks/useMeet'
import * as service from '../../src/lib/meets-service'
import * as venueHook from '../../src/hooks/useVenues'

vi.mock('../../src/hooks/useMeet')
vi.mock('../../src/lib/meets-service')
vi.mock('../../src/hooks/useVenues', () => ({
  useVenues: () => ({ venues: [], loading: false }),
}))

const meet = {
  id: 'abc', name: 'Big 12 Indoor', date: '2026-02-28',
  location: 'Fayetteville, AR', season: 'indoor' as const,
  venue_id: null, venue: null, indoor: true,
  division: 'D1', timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
  created_at: '2026-01-01', updated_at: null,
}
const events = [{ id: 'e1', meet_id: 'abc', distance: '800m', gender: 'Women', name: null, date: null, location: null, season: null, source_url: null, results: [{ count: 24 }] }]

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/meets/abc']}>
      <Routes>
        <Route path="/meets/:id" element={<MeetDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MeetDetail', () => {
  beforeEach(() => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: null, refetch: vi.fn(),
    })
  })

  it('renders meet name in the form', () => {
    renderDetail()
    expect(screen.getByDisplayValue('Big 12 Indoor')).toBeInTheDocument()
  })

  it('renders back link to /meets', () => {
    renderDetail()
    expect(screen.getByRole('link', { name: /meets/i })).toHaveAttribute('href', '/meets')
  })

  it('renders linked events section', () => {
    renderDetail()
    expect(screen.getByText('800m')).toBeInTheDocument()
    expect(screen.getByText('Women')).toBeInTheDocument()
  })

  it('shows Save button when isDirty', () => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: { name: 'Changed' }, setPatch: vi.fn(),
      isDirty: true, loading: false, error: null, refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('calls updateMeet on save', async () => {
    const refetch = vi.fn()
    vi.mocked(service.updateMeet).mockResolvedValue({ ...meet, name: 'Changed' } as any)
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: { name: 'Changed' }, setPatch: vi.fn(),
      isDirty: true, loading: false, error: null, refetch,
    })
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(service.updateMeet).toHaveBeenCalledWith(expect.anything(), 'abc', { name: 'Changed' }))
  })

  it('shows loading state', () => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet: null, events: [], patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: true, error: null, refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state when error is set', () => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet: null, events: [], patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: new Error('not found'), refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })

  it('shows "Meet not found" when no meet and no error', () => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet: null, events: [], patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: null, refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByText(/meet not found/i)).toBeInTheDocument()
  })

  it('shows save error when updateMeet throws', async () => {
    vi.mocked(service.updateMeet).mockRejectedValue(new Error('save failed'))
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events, patch: { name: 'Changed' }, setPatch: vi.fn(),
      isDirty: true, loading: false, error: null, refetch: vi.fn(),
    })
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText(/save failed/i)).toBeInTheDocument())
  })

  it('shows empty events state when no events', () => {
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet, events: [], patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: null, refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByText(/no events linked/i)).toBeInTheDocument()
  })

  it('shows altitude venue info when venue is_altitude', () => {
    const meetWithVenue = { ...meet, venue: { id: 'v1', city: 'Albuquerque', is_altitude: true } }
    vi.mocked(useMeetHook.useMeet).mockReturnValue({
      meet: meetWithVenue as any, events, patch: {}, setPatch: vi.fn(),
      isDirty: false, loading: false, error: null, refetch: vi.fn(),
    })
    renderDetail()
    expect(screen.getByText(/yes/i)).toBeInTheDocument()
  })
})
