import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MeetForm } from '../../src/components/MeetForm'
import type { MeetPayload } from '../../src/lib/types'
import * as venueHook from '../../src/hooks/useVenues'

vi.mock('../../src/hooks/useVenues')

const emptyValues: MeetPayload = {
  name: null, date: null, location: null, venue_id: null,
  division: null, season: null, indoor: null, timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
}

describe('MeetForm', () => {
  beforeEach(() => {
    vi.mocked(venueHook.useVenues).mockReturnValue({ venues: [], loading: false })
  })

  it('renders name, date, location, division, timing_company fields', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/division/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/timing/i)).toBeInTheDocument()
  })

  it('renders season select with 3 options', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    const select = screen.getByLabelText(/season/i) as HTMLSelectElement
    expect(select.options).toHaveLength(4) // blank + 3 seasons
  })

  it('calls onChange when name is edited', () => {
    const onChange = vi.fn()
    render(<MeetForm values={emptyValues} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Meet' } })
    expect(onChange).toHaveBeenCalledWith({ name: 'New Meet' })
  })

  it('pre-fills scraped_at with now() when focused and empty', () => {
    render(<MeetForm values={{ ...emptyValues, scraped_at: null }} onChange={vi.fn()} />)
    const input = screen.getByLabelText(/scraped/i) as HTMLInputElement
    fireEvent.focus(input)
    expect(input.value).not.toBe('')
  })

  it('does not overwrite scraped_at when already set', () => {
    render(<MeetForm values={{ ...emptyValues, scraped_at: '2026-03-01T12:00' }} onChange={vi.fn()} />)
    const input = screen.getByLabelText(/scraped/i) as HTMLInputElement
    expect(input.value).toBe('2026-03-01T12:00')
    fireEvent.focus(input)
    expect(input.value).toBe('2026-03-01T12:00')
  })

  it('renders URL fields in a collapsible section', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    expect(screen.getByText(/urls/i)).toBeInTheDocument()
  })

  it('opens URL section on toggle button click', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText(/urls/i))
    expect(screen.getByLabelText(/live url 1 \(athletics/i)).toBeInTheDocument()
  })

  it('calls onChange with a_live_url_1 when URL 1 field changes', () => {
    const onChange = vi.fn()
    render(<MeetForm values={emptyValues} onChange={onChange} />)
    fireEvent.click(screen.getByText(/urls/i))
    fireEvent.change(screen.getByLabelText(/live url 1 \(athletics/i), { target: { value: 'https://example.com' } })
    expect(onChange).toHaveBeenCalledWith({ a_live_url_1: 'https://example.com' })
  })

  it('calls onChange with a_live_url_1_scrapable when checkbox toggled', () => {
    const onChange = vi.fn()
    render(<MeetForm values={emptyValues} onChange={onChange} />)
    fireEvent.click(screen.getByText(/urls/i))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onChange).toHaveBeenCalledWith({ a_live_url_1_scrapable: true })
  })

  it('calls onChange with live_url_2_scrapable when second checkbox toggled', () => {
    const onChange = vi.fn()
    render(<MeetForm values={emptyValues} onChange={onChange} />)
    fireEvent.click(screen.getByText(/urls/i))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    expect(onChange).toHaveBeenCalledWith({ live_url_2_scrapable: true })
  })

  it('closes URL section on second toggle button click', () => {
    render(<MeetForm values={emptyValues} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText(/urls/i))
    expect(screen.getByLabelText(/live url 1 \(athletics/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/urls/i))
    expect(screen.queryByLabelText(/live url 1 \(athletics/i)).not.toBeInTheDocument()
  })

  it('calls onChange when scraped_at input changes', () => {
    const onChange = vi.fn()
    render(<MeetForm values={emptyValues} onChange={onChange} />)
    const input = screen.getByLabelText(/scraped/i)
    fireEvent.change(input, { target: { value: '2026-04-11T12:00' } })
    expect(onChange).toHaveBeenCalledWith({ scraped_at: '2026-04-11T12:00' })
  })

  it('clears scraped_at when input cleared', () => {
    const onChange = vi.fn()
    render(<MeetForm values={{ ...emptyValues, scraped_at: '2026-03-01T12:00' }} onChange={onChange} />)
    const input = screen.getByLabelText(/scraped/i)
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith({ scraped_at: null })
  })
})
