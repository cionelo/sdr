import { useState } from 'react'
import { useVenues } from '../hooks/useVenues'

interface Props {
  value: string | null
  currentCity: string | null
  onChange: (venueId: string | null) => void
}

export function VenueTypeahead({ value, currentCity, onChange }: Props) {
  const [query, setQuery] = useState(currentCity || '')
  const [open, setOpen] = useState(false)
  const { venues } = useVenues(open ? query : '')

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange(null)
  }

  const select = (id: string, city: string) => {
    onChange(id)
    setQuery(city)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="field-input"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder="Search venue city..."
      />
      {open && venues.length > 0 && (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            width: '100%',
          }}
        >
          {venues.map((v) => (
            <div
              key={v.id}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
              onMouseDown={() => select(v.id, v.city)}
              onClick={() => select(v.id, v.city)}
            >
              {v.city}
              {v.is_altitude && (
                <span style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 11 }}>
                  ALT
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
