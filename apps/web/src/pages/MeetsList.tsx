import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeets } from '../hooks/useMeets'
import { FilterBar } from '../components/FilterBar'
import { AddMeetDrawer } from '../components/AddMeetDrawer'
import type { Meet } from '../lib/types'

function NullFlag() {
  return <span style={{ color: '#DC2626', fontFamily: 'Teko', fontSize: 14 }}>⌀</span>
}

function MeetRow({ meet, onClick }: { meet: Meet; onClick: () => void }) {
  const eventCount = meet.events?.[0]?.count ?? 0
  const isAltitude = meet.venue?.is_altitude

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-thin)' }}
    >
      <td style={{ padding: '10px 12px', fontWeight: 500 }}>
        {meet.name ?? <NullFlag />}
        {isAltitude && (
          <span style={{ marginLeft: 8, fontFamily: 'Teko', fontSize: 12, color: 'var(--accent)', border: '1px solid var(--accent)', padding: '1px 6px' }}>
            ALT
          </span>
        )}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
        {meet.date ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {meet.location ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase' }}>
        {meet.season ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {meet.division ?? <NullFlag />}
      </td>
      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, textAlign: 'right' }}>
        {eventCount}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        {meet.scraped_at
          ? <span style={{ color: '#16A34A' }}>✓</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
    </tr>
  )
}

export function MeetsList() {
  const navigate = useNavigate()
  const { meets, filters, setFilters, loading, error, refetch } = useMeets()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="finish-stripe" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div className="window-card">
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Meets
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, marginLeft: 12, color: 'var(--text-muted)' }}>
                {meets.length}
              </span>
            </span>
            <button className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Add Meet
            </button>
          </div>

          <FilterBar filters={filters} onFiltersChange={setFilters} />

          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 18, textTransform: 'uppercase' }}>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ padding: 16, color: '#DC2626', fontSize: 13 }}>
              {error.message}
            </div>
          )}

          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card-inner)' }}>
                    {['Name', 'Date', 'Location', 'Season', 'Division', 'Events', 'Scraped'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Events' || h === 'Scraped' ? 'center' : 'left', fontFamily: 'Teko', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meets.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No meets match current filters
                      </td>
                    </tr>
                  ) : (
                    meets.map((meet) => (
                      <MeetRow
                        key={meet.id}
                        meet={meet}
                        onClick={() => navigate(`/meets/${meet.id}`)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddMeetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); refetch() }}
      />
    </div>
  )
}
