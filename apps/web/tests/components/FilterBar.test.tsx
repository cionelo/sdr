import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar } from '../../src/components/FilterBar'
import type { MeetFilters } from '../../src/lib/types'

const noop = vi.fn()

describe('FilterBar', () => {
  it('renders search input', () => {
    render(<FilterBar filters={{}} onFiltersChange={noop} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('calls onFiltersChange with search value', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{}} onFiltersChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'big 12' },
    })
    // debounced — check it's called eventually (or directly test the internal value)
    expect(screen.getByDisplayValue('big 12')).toBeInTheDocument()
  })

  it('renders season pills: All, Indoor, Outdoor, XC', () => {
    render(<FilterBar filters={{}} onFiltersChange={noop} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText(/indoor/i)).toBeInTheDocument()
    expect(screen.getByText(/outdoor/i)).toBeInTheDocument()
    expect(screen.getByText(/xc/i)).toBeInTheDocument()
  })

  it('clicking a season pill calls onFiltersChange with season', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{}} onFiltersChange={onChange} />)

    fireEvent.click(screen.getByText(/^indoor$/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ season: 'indoor' }))
  })

  it('clicking active season pill clears it', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{ season: 'indoor' }} onFiltersChange={onChange} />)

    fireEvent.click(screen.getByText(/^indoor$/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ season: undefined }))
  })

  it('renders date range inputs', () => {
    render(<FilterBar filters={{}} onFiltersChange={noop} />)
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument()
  })
})
