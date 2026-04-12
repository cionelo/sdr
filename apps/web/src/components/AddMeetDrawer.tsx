import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { createMeet } from '../lib/meets-service'
import { MeetForm } from './MeetForm'
import type { MeetPayload } from '../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const emptyPayload: MeetPayload = {
  name: null, date: null, location: null, venue_id: null,
  division: null, season: null, indoor: null, timing_company: null,
  a_live_url_1: null, a_live_url_1_scrapable: null,
  live_url_2: null, live_url_2_scrapable: null,
  tfrrs_url: null, source_url: null, scraped_at: null,
}

export function AddMeetDrawer({ open, onClose, onSaved }: Props) {
  const [values, setValues] = useState<MeetPayload>(emptyPayload)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleChange = (patch: Partial<MeetPayload>) =>
    setValues((prev) => ({ ...prev, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await createMeet(supabase, values)
      setValues(emptyPayload)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480,
          background: 'var(--bg-card)', borderLeft: '3px solid var(--border)',
          zIndex: 50, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="window-header">
          <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Add Meet
          </span>
          <button aria-label="close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <MeetForm values={values} onChange={handleChange} />
        </div>

        {error && (
          <div style={{ padding: '8px 12px', color: '#DC2626', fontSize: 13 }}>{error}</div>
        )}

        <div style={{ padding: '12px', borderTop: '2px solid var(--border)' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Saving...' : 'Save Meet'}
          </button>
        </div>
      </div>
    </>
  )
}
