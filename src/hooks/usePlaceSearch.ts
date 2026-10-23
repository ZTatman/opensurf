import { useEffect, useState } from 'react'
import { cachedPlaces, cachePlaces, searchPlaces, type Place } from '../services/geocoding'

type SearchState = { query: string; places: Place[]; status: 'loading' | 'ready' | 'error'; error?: string }

const DEBOUNCE_MS = 450
const TIMEOUT_MS = 8_000
const MIN_LENGTH = 3

// City suggestions for the search box: debounced, cancelled when superseded, and timed out.
export function usePlaceSearch(query: string, enabled: boolean) {
  const term = query.trim()
  const [state, setState] = useState<SearchState | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const debounce = setTimeout(async () => {
      if (!enabled || term.length < MIN_LENGTH) return
      const cached = cachedPlaces(term)
      if (cached) {
        setState({ query: term, places: cached, status: 'ready' })
        return
      }
      setState({ query: term, places: [], status: 'loading' })
      timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const places = await searchPlaces(term, controller.signal)
        if (!active) return
        cachePlaces(term, places)
        setState({ query: term, places, status: 'ready' })
      } catch {
        if (active) setState({ query: term, places: [], status: 'error', error: 'City search is unavailable. You can still search catalog beaches and regions.' })
      } finally {
        clearTimeout(timeout)
      }
    }, DEBOUNCE_MS)
    return () => { active = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort() }
  }, [term, enabled])
  return enabled && state?.query === term ? state : null
}
