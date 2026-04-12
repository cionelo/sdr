import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fetchResultSplits } from '../lib/meets-service'
import type { Split } from '../lib/types'

export function useEventSplits(resultId: string) {
  const [splits, setSplits] = useState<Split[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchResultSplits(supabase, resultId)
      .then(setSplits)
      .catch((err: Error) => { setError(err); setSplits([]) })
      .finally(() => setLoading(false))
  }, [resultId])

  useEffect(() => { load() }, [load])

  return { splits, loading, error, refetch: load }
}
