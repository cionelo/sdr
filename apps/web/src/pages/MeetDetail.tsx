import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateMeet } from '../lib/meets-service'
import { useMeet } from '../hooks/useMeet'
import { MeetForm } from '../components/MeetForm'
import type { MeetPayload } from '../lib/types'

export function MeetDetail() {
  const { id } = useParams<{ id: string }>()
  const { meet, events, patch, setPatch, isDirty, loading, error, refetch } = useMeet(id!)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSave = async () => {
    if (!meet || !isDirty) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateMeet(supabase, meet.id, patch as Partial<MeetPayload>)
      refetch()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="finish-stripe" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 18, textTransform: 'uppercase' }}>Loading...</div>
      </div>
    )
  }

  if (error || !meet) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="finish-stripe" />
        <div style={{ padding: 40, color: '#DC2626' }}>{error?.message ?? 'Meet not found'}</div>
      </div>
    )
  }

  const formValues: MeetPayload = { ...meet, ...patch }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="finish-stripe" />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link to="/meets" style={{ fontFamily: 'Teko', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}>
            ← Meets
          </Link>
        </div>

        <div className="window-card" style={{ marginBottom: 16 }}>
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {meet.name ?? '—'}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                aria-label="Edit"
                onClick={() => setEditOpen((v) => !v)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: editOpen ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                ✎ Edit
              </button>
              {editOpen && isDirty && (
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-thin)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Altitude:</span>
            {meet.venue
              ? (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: meet.venue.is_altitude ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {meet.venue.is_altitude ? `Yes — ${meet.venue.city}` : 'No'}
                </span>
              )
              : <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
          </div>

          {editOpen && (
            <>
              <MeetForm
                values={formValues}
                onChange={setPatch}
                venueCity={meet.venue?.city}
              />
              {saveError && (
                <div style={{ padding: '8px 12px', color: '#DC2626', fontSize: 13 }}>{saveError}</div>
              )}
            </>
          )}
        </div>

        <div className="window-card">
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Events
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, marginLeft: 10, color: 'var(--text-muted)' }}>
                {events.length}
              </span>
            </span>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 16, textTransform: 'uppercase' }}>
              No events linked
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card-inner)' }}>
                  {['Distance', 'Gender', 'Division', 'Provider', 'Results'].map((h) => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-thin)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                      <Link
                        to={`/meets/${id}/events/${ev.id}`}
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {ev.distance ?? '—'}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{ev.gender ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-muted)' }}>{ev.division ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-muted)' }}>{ev.provider ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                      {ev.results?.[0]?.count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
