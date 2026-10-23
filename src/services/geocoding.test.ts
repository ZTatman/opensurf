import { afterEach, expect, it, vi } from 'vitest'
import { cachedPlaces, cachePlaces, searchPlaces } from './geocoding'

afterEach(() => vi.unstubAllGlobals())

it('requests place candidates without sending device coordinates', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
    { id: 1, name: 'Boston', admin1: 'Massachusetts', country: 'United States', latitude: 42.36, longitude: -71.06 },
    { id: 2, name: 'Invalid', latitude: 300, longitude: 0 },
    { name: 'Missing identity', latitude: 0, longitude: 0 },
  ] })))
  vi.stubGlobal('fetch', fetchMock)
  const controller = new AbortController()
  expect(await searchPlaces(' Boston ', controller.signal)).toEqual([
    { id: 'place:1', name: 'Boston', label: 'Boston, Massachusetts, United States', latitude: 42.36, longitude: -71.06 },
  ])
  const [url, options] = fetchMock.mock.calls[0]
  expect(url.searchParams.get('name')).toBe('Boston')
  expect(url.searchParams.has('latitude')).toBe(false)
  expect(options.signal).toBe(controller.signal)
})

it('handles empty results, service errors, malformed responses, and aborts', async () => {
  const signal = new AbortController().signal
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValueOnce(new Response('{}'))
  expect(await searchPlaces('Unknown', signal)).toEqual([])
  fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
  await expect(searchPlaces('Boston', signal)).rejects.toThrow('unavailable')
  fetchMock.mockResolvedValueOnce(new Response('{"results":"unexpected"}'))
  await expect(searchPlaces('Boston', signal)).rejects.toThrow('unexpected')
  fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
  await expect(searchPlaces('Boston', signal)).rejects.toMatchObject({ name: 'AbortError' })
})


it('recognizes local city abbreviations accepted by the catalog', async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  for (const [query, expected] of [
    ['Port St Lucie', 'Port Saint Lucie'],
    ['Port St. Lucie', 'Port Saint Lucie'],
    ['Ft. Pierce', 'Fort Pierce'],
  ]) {
    await searchPlaces(query, new AbortController().signal)
    expect((fetchMock.mock.lastCall?.[0] as URL).searchParams.get('name')).toBe(expected)
  }
})

it('caches recent results case-insensitively and evicts the oldest', () => {
  const place = { id: 'place:1', name: 'Boston', label: 'Boston, Massachusetts, United States', latitude: 42.36, longitude: -71.06 }
  cachePlaces('Boston', [place])
  expect(cachedPlaces(' boston ')).toEqual([place])
  for (let index = 0; index < 40; index++) cachePlaces(`query ${index}`, [])
  expect(cachedPlaces('Boston')).toBeUndefined()
  expect(cachedPlaces('query 39')).toEqual([])
})
