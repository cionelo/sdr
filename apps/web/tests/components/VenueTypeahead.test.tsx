import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VenueTypeahead } from '../../src/components/VenueTypeahead'
import * as hook from '../../src/hooks/useVenues'

vi.mock('../../src/hooks/useVenues')

const venues = [
  { id: 'v1', city: 'Boston', is_altitude: false },
  { id: 'v2', city: 'Albuquerque', is_altitude: true },
]

describe('VenueTypeahead', () => {
  it('renders the current venue city if selected', () => {
    vi.mocked(hook.useVenues).mockReturnValue({ venues: [], loading: false })
    render(
      <VenueTypeahead value="v1" currentCity="Boston" onChange={vi.fn()} />,
    )
    expect(screen.getByDisplayValue('Boston')).toBeInTheDocument()
  })

  it('shows dropdown results when venues are returned', () => {
    vi.mocked(hook.useVenues).mockReturnValue({ venues, loading: false })
    render(<VenueTypeahead value={null} currentCity={null} onChange={vi.fn()} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bo' } })
    expect(screen.getByText('Boston')).toBeInTheDocument()
    expect(screen.getByText('Albuquerque')).toBeInTheDocument()
  })

  it('calls onChange with venue id when a result is clicked', () => {
    vi.mocked(hook.useVenues).mockReturnValue({ venues, loading: false })
    const onChange = vi.fn()
    render(<VenueTypeahead value={null} currentCity={null} onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alb' } })
    fireEvent.click(screen.getByText('Albuquerque'))

    expect(onChange).toHaveBeenCalledWith('v2')
  })
})
