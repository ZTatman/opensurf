import { useEffect, useState } from 'react'

export type Coordinates = { latitude: number; longitude: number }
export type Place = Coordinates & { id: string; label: string; name: string }

export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const point = value as Coordinates
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  const name = query.trim().replace(/\bst\.?(?=\s)/gi, 'Saint').replace(/\bft\.?(?=\s)/gi, 'Fort')
  url.search = new URLSearchParams({ name, count: '4', language: 'en', format: 'json' }).toString()
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Place search is unavailable. Try a beach or region in the catalog.')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('results' in data)) return []
  if (!Array.isArray(data.results)) throw new Error('Place search returned an unexpected response.')
  return data.results.flatMap((value: unknown) => {
    if (!validCoordinates(value)) return []
    const item = value as Coordinates & Record<string, unknown>
    if (typeof item.name !== 'string' || typeof item.id !== 'number') return []
    const parts = [item.name, item.admin1, item.country].filter((part): part is string => typeof part === 'string' && part.length > 0)
    return [{ id: `place:${item.id}`, name: item.name, label: [...new Set(parts)].join(', '), latitude: item.latitude, longitude: item.longitude }]
  })
}

type SearchState = { query: string; places: Place[]; status: 'loading' | 'ready' | 'error'; error?: string }
const cache = new Map<string, Place[]>()

export function usePlaceSearch(query: string, enabled: boolean) {
  const term = query.trim()
  const [state, setState] = useState<SearchState | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const debounce = setTimeout(async () => {
      if (!enabled || term.length < 3) return
      const cached = cache.get(term.toLocaleLowerCase())
      if (cached) {
        setState({ query: term, places: cached, status: 'ready' })
        return
      }
      setState({ query: term, places: [], status: 'loading' })
      timeout = setTimeout(() => controller.abort(), 8_000)
      try {
        const places = await searchPlaces(term, controller.signal)
        if (!active) return
        if (cache.size >= 40) cache.delete(cache.keys().next().value!)
        cache.set(term.toLocaleLowerCase(), places)
        setState({ query: term, places, status: 'ready' })
      } catch {
        if (active) setState({ query: term, places: [], status: 'error', error: 'City search is unavailable. You can still search catalog beaches and regions.' })
      } finally {
        clearTimeout(timeout)
      }
    }, 450)
    return () => { active = false; clearTimeout(debounce); clearTimeout(timeout); controller.abort() }
  }, [term, enabled])
  return enabled && state?.query === term ? state : null
}
