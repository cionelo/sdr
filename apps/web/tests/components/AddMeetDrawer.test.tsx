import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddMeetDrawer } from '../../src/components/AddMeetDrawer'
import * as service from '../../src/lib/meets-service'
import * as venueHook from '../../src/hooks/useVenues'

vi.mock('../../src/lib/meets-service')
vi.mock('../../src/hooks/useVenues')

describe('AddMeetDrawer', () => {
  beforeEach(() => {
    vi.mocked(venueHook.useVenues).mockReturnValue({ venues: [], loading: false })
  })

  it('renders form fields when open', () => {
    render(<AddMeetDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddMeetDrawer open={false} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
  })

  it('calls createMeet and onSaved on submit', async () => {
    const newMeet = { id: 'new1', name: 'Test', date: null, season: null, venue: null, events: [] }
    vi.mocked(service.createMeet).mockResolvedValue(newMeet as any)
    const onSaved = vi.fn()

    render(<AddMeetDrawer open={true} onClose={vi.fn()} onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test Meet' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(service.createMeet).toHaveBeenCalled()
  })

  it('shows error message on createMeet failure', async () => {
    vi.mocked(service.createMeet).mockRejectedValue(new Error('insert failed'))

    render(<AddMeetDrawer open={true} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText(/insert failed/i)).toBeInTheDocument())
  })

  it('calls onClose when × is clicked', () => {
    const onClose = vi.fn()
    render(<AddMeetDrawer open={true} onClose={onClose} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
