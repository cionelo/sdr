import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchVenues } from '../lib/meets-service'
import type { Venue } from '../lib/types'

export function useVenues(query: string) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setVenues([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetchVenues(supabase, query)
      .then(setVenues)
      .catch(() => setVenues([]))
      .finally(() => setLoading(false))
  }, [query])

  return { venues, loading }
}
