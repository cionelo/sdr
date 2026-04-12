import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchMeet } from '../lib/meets-service'
import type { Meet, MeetEvent, MeetPayload } from '../lib/types'

export function useMeet(id: string) {
  const [meet, setMeet] = useState<Meet | null>(null)
  const [events, setEvents] = useState<MeetEvent[]>([])
  const [patch, setPatchState] = useState<Partial<MeetPayload>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchMeet(supabase, id)
      .then(({ meet, events }) => {
        setMeet(meet)
        setEvents(events)
        setPatchState({})
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const setPatch = (update: Partial<MeetPayload>) => {
    setPatchState((prev) => ({ ...prev, ...update }))
  }

  const isDirty = Object.keys(patch).length > 0

  return { meet, events, patch, setPatch, isDirty, loading, error, refetch: load }
}
