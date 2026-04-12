import { useState } from 'react'
import type { MeetPayload } from '../lib/types'
import { VenueTypeahead } from './VenueTypeahead'

interface Props {
  values: MeetPayload
  onChange: (patch: Partial<MeetPayload>) => void
  venueCity?: string | null
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function MeetForm({ values, onChange, venueCity }: Props) {
  const [urlsOpen, setUrlsOpen] = useState(false)
  // Local state for scraped_at so focus-prefill works in controlled mode
  const [scrapedAt, setScrapedAt] = useState(values.scraped_at || '')

  const set = (key: keyof MeetPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ [key]: e.target.value || null })

  const handleScrapedFocus = () => {
    if (!scrapedAt) {
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setScrapedAt(local)
      onChange({ scraped_at: local })
    }
  }

  return (
    <div style={{ padding: '16px 12px' }}>
      <Field label="Name" id="name">
        <input id="name" className="field-input" value={values.name || ''} onChange={set('name')} />
      </Field>
      <Field label="Date" id="date">
        <input id="date" type="date" className="field-input" value={values.date || ''} onChange={set('date')} />
      </Field>
      <Field label="Location" id="location">
        <input id="location" className="field-input" value={values.location || ''} onChange={set('location')} />
      </Field>
      <Field label="Venue" id="venue">
        <VenueTypeahead
          value={values.venue_id || null}
          currentCity={venueCity || null}
          onChange={(id) => onChange({ venue_id: id })}
        />
      </Field>
      <Field label="Division" id="division">
        <input id="division" className="field-input" value={values.division || ''} onChange={set('division')} />
      </Field>
      <Field label="Season" id="season">
        <select id="season" className="field-input" value={values.season || ''} onChange={set('season')}>
          <option value="">—</option>
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
          <option value="xc">XC</option>
        </select>
      </Field>
      <Field label="Timing Company" id="timing_company">
        <input id="timing_company" className="field-input" value={values.timing_company || ''} onChange={set('timing_company')} />
      </Field>
      <Field label="Scraped At" id="scraped_at">
        <input
          id="scraped_at"
          type="datetime-local"
          className="field-input"
          value={scrapedAt}
          onFocus={handleScrapedFocus}
          onChange={(e) => {
            setScrapedAt(e.target.value)
            onChange({ scraped_at: e.target.value || null })
          }}
        />
      </Field>

      {/* URLs — collapsible */}
      <div style={{ borderTop: '1px solid var(--border-thin)', marginTop: 12, paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => setUrlsOpen((o) => !o)}
          style={{ fontFamily: 'Teko', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}
        >
          {urlsOpen ? '▲' : '▼'} URLs
        </button>
        {urlsOpen && (
          <div style={{ marginTop: 8 }}>
            <Field label="Live URL 1 (AthleticsLive)" id="a_live_url_1">
              <input id="a_live_url_1" type="url" className="field-input" value={values.a_live_url_1 || ''} onChange={set('a_live_url_1')} />
            </Field>
            <Field label="Live URL 1 Scrapable" id="a_live_url_1_scrapable">
              <input
                id="a_live_url_1_scrapable"
                type="checkbox"
                checked={!!values.a_live_url_1_scrapable}
                onChange={(e) => onChange({ a_live_url_1_scrapable: e.target.checked })}
              />
            </Field>
            <Field label="Live URL 2" id="live_url_2">
              <input id="live_url_2" type="url" className="field-input" value={values.live_url_2 || ''} onChange={set('live_url_2')} />
            </Field>
            <Field label="Live URL 2 Scrapable" id="live_url_2_scrapable">
              <input
                id="live_url_2_scrapable"
                type="checkbox"
                checked={!!values.live_url_2_scrapable}
                onChange={(e) => onChange({ live_url_2_scrapable: e.target.checked })}
              />
            </Field>
            <Field label="TFRRS URL" id="tfrrs_url">
              <input id="tfrrs_url" type="url" className="field-input" value={values.tfrrs_url || ''} onChange={set('tfrrs_url')} />
            </Field>
            <Field label="TFRRS ID" id="tfrrs_id">
              <input id="tfrrs_id" className="field-input" value={values.tfrrs_id || ''} onChange={set('tfrrs_id')} />
            </Field>
            <Field label="Source URL (scraper-managed)" id="source_url">
              <input id="source_url" type="url" className="field-input" value={values.source_url || ''} onChange={set('source_url')} />
            </Field>
            <Field label="Source URL Has Splits" id="source_url_has_splits">
              <input
                id="source_url_has_splits"
                type="checkbox"
                checked={!!values.source_url_has_splits}
                onChange={(e) => onChange({ source_url_has_splits: e.target.checked })}
              />
            </Field>
            <Field label="Source URL Known Provider" id="source_url_known_provider">
              <input
                id="source_url_known_provider"
                type="checkbox"
                checked={!!values.source_url_known_provider}
                onChange={(e) => onChange({ source_url_known_provider: e.target.checked })}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}
