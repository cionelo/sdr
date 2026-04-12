import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchMeets } from '../lib/meets-service'
import type { Meet, MeetFilters, Season } from '../lib/types'

function filtersFromParams(params: URLSearchParams): MeetFilters {
  return {
    search: params.get('search') || undefined,
    season: (params.get('season') as Season) || undefined,
    dateFrom: params.get('dateFrom') || undefined,
    dateTo: params.get('dateTo') || undefined,
    isAltitude: params.has('isAltitude') ? params.get('isAltitude') === 'true' : undefined,
    hasScrapableUrl: params.has('hasScrapableUrl') ? params.get('hasScrapableUrl') === 'true' : undefined,
    hasScraped: params.has('hasScraped') ? params.get('hasScraped') === 'true' : undefined,
  }
}

export function useMeets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [meets, setMeets] = useState<Meet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const filters = filtersFromParams(searchParams)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchMeets(supabase, filters)
      .then(setMeets)
      .catch(setError)
      .finally(() => setLoading(false))
  // searchParams.toString() as dep ensures re-fetch when params change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  useEffect(() => { load() }, [load])

  const setFilters = (update: Partial<MeetFilters>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(update).forEach(([k, v]) => {
      if (v === undefined || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSearchParams(next, { replace: true })
  }

  return { meets, filters, setFilters, loading, error, refetch: load }
}
