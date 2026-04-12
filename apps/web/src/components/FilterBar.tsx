import { useState, useEffect } from 'react'
import type { MeetFilters, Season } from '../lib/types'

interface Props {
  filters: MeetFilters
  onFiltersChange: (f: MeetFilters) => void
}

function SeasonPillGroup({
  value,
  onChange,
}: {
  value: Season | undefined
  onChange: (v: Season | undefined) => void
}) {
  const options: { label: string; value: Season | undefined }[] = [
    { label: 'All', value: undefined },
    { label: 'Indoor', value: 'indoor' },
    { label: 'Outdoor', value: 'outdoor' },
    { label: 'XC', value: 'xc' },
  ]
  return (
    <div className="pill-group">
      {options.map((opt) => (
        <button
          key={String(opt.value ?? 'all')}
          className={`pill ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(value === opt.value ? undefined : opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function BoolPillGroup({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | undefined
  onChange: (v: boolean | undefined) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'Teko', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginRight: 2 }}>{label}</span>
      <div className="pill-group">
        {([undefined, true, false] as (boolean | undefined)[]).map((opt) => (
          <button
            key={String(opt)}
            className={`pill ${value === opt ? 'active' : ''}`}
            onClick={() => onChange(value === opt ? undefined : opt)}
          >
            {opt === undefined ? '—' : opt ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FilterBar({ filters, onFiltersChange }: Props) {
  const [search, setSearch] = useState(filters.search || '')

  useEffect(() => {
    const t = setTimeout(() => {
      onFiltersChange({ ...filters, search: search || undefined })
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const set = (update: Partial<MeetFilters>) => onFiltersChange({ ...filters, ...update })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-thin)' }}>
      <input
        className="field-input"
        placeholder="Search meets by name or location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <SeasonPillGroup
          value={filters.season}
          onChange={(v) => set({ season: v })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor="dateFrom" style={{ fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>From</label>
          <input id="dateFrom" type="date" className="field-input" style={{ width: 'auto' }}
            value={filters.dateFrom || ''}
            onChange={(e) => set({ dateFrom: e.target.value || undefined })} />
          <label htmlFor="dateTo" style={{ fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>To</label>
          <input id="dateTo" type="date" className="field-input" style={{ width: 'auto' }}
            value={filters.dateTo || ''}
            onChange={(e) => set({ dateTo: e.target.value || undefined })} />
        </div>
        <BoolPillGroup label="Altitude" value={filters.isAltitude} onChange={(v) => set({ isAltitude: v })} />
        <BoolPillGroup label="Scrapable" value={filters.hasScrapableUrl} onChange={(v) => set({ hasScrapableUrl: v })} />
        <BoolPillGroup label="Scraped" value={filters.hasScraped} onChange={(v) => set({ hasScraped: v })} />
      </div>
    </div>
  )
}
