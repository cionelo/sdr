import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMeet } from '../hooks/useMeet'
import { useEventResults } from '../hooks/useEventResults'
import { useEventSplits } from '../hooks/useEventSplits'
import type { Result, Split } from '../lib/types'

function formatTime(s: number | null): string {
  if (s === null) return '—'
  return s.toFixed(2)
}

function SplitsPanel({ resultId }: { resultId: string }) {
  const { splits, loading } = useEventSplits(resultId)
  if (loading) return <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>Loading splits...</div>
  if (splits.length === 0) return <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>No splits</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card-inner)' }}>
      <thead>
        <tr>
          {['Label', 'Dist (m)', 'Cumulative', 'Split'].map((h) => (
            <th key={h} style={{ padding: '4px 12px', textAlign: 'left', fontFamily: 'Teko', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {splits.map((sp: Split) => (
          <tr key={sp.id} style={{ borderTop: '1px solid var(--border-thin)' }}>
            <td style={{ padding: '4px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{sp.label ?? '—'}</td>
            <td style={{ padding: '4px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{sp.distance_m ?? '—'}</td>
            <td style={{ padding: '4px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{formatTime(sp.elapsed_s)}</td>
            <td style={{ padding: '4px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{formatTime(sp.lap_s)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ResultRow({ result, place }: { result: Result; place: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border-thin)' }}>
        <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-muted)' }}>{place}</td>
        <td style={{ padding: '8px 12px', fontSize: 13 }}>{result.athlete?.name ?? '—'}</td>
        <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{result.athlete?.team?.name ?? '—'}</td>
        <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{formatTime(result.time_s)}</td>
        <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-muted)' }}>
          {result.normalized_time_s !== null ? formatTime(result.normalized_time_s) : '—'}
        </td>
        <td style={{ padding: '8px 12px' }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ fontFamily: 'Teko', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', color: expanded ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            Splits
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <SplitsPanel resultId={result.id} />
          </td>
        </tr>
      )}
    </>
  )
}

export function EventResultsPage() {
  const { id, eventId } = useParams<{ id: string; eventId: string }>()
  const { events, loading: meetLoading } = useMeet(id!)
  const { results, loading, error } = useEventResults(eventId!)

  const event = events.find((e) => e.id === eventId)

  if (loading || meetLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="finish-stripe" />
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 18, textTransform: 'uppercase' }}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="finish-stripe" />
        <div style={{ padding: 40, color: '#DC2626' }}>{error.message}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="finish-stripe" />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link to={`/meets/${id}`} style={{ fontFamily: 'Teko', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}>
            ← Meet
          </Link>
        </div>

        <div className="window-card" style={{ marginBottom: 16 }}>
          <div className="window-header">
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {event?.distance ?? '—'}
              </span>
              <span style={{ fontFamily: 'Teko', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                {event?.gender ?? '—'}
              </span>
              {event?.division && (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-muted)' }}>{event.division}</span>
              )}
              {event?.date && (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-muted)' }}>{event.date}</span>
              )}
            </div>
          </div>
        </div>

        <div className="window-card">
          <div className="window-header">
            <span style={{ fontFamily: 'Teko', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Results
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, marginLeft: 10, color: 'var(--text-muted)' }}>
                {results.length}
              </span>
            </span>
          </div>
          {results.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Teko', fontSize: 16, textTransform: 'uppercase' }}>
              No results
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-card-inner)' }}>
                  {['#', 'Athlete', 'Team', 'Time', 'Norm. Time', ''].map((h, i) => (
                    <th key={i} style={{ padding: '6px 12px', textAlign: 'left', fontFamily: 'Teko', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <ResultRow key={r.id} result={r} place={i + 1} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
