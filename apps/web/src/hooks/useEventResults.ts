import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchEventResults } from '../lib/meets-service'
import type { Result } from '../lib/types'

export function useEventResults(eventId: string) {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchEventResults(supabase, eventId)
      .then(setResults)
      .catch((err: Error) => { setError(err); setResults([]) })
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => { load() }, [load])

  return { results, loading, error, refetch: load }
}
