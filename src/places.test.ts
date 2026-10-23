import { afterEach, expect, it, vi } from 'vitest'
import { requestLocation } from './location'
import { searchPlaces, validCoordinates } from './places'

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
  expect(validCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
  expect(validCoordinates({ latitude: '42', longitude: 0 })).toBe(false)
})


it('gets a location on demand with bounded wait and handles denied permission', async () => {
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
    success({ coords: { latitude: 42, longitude: -71 } } as GeolocationPosition)
  })
  expect(await requestLocation({ getCurrentPosition })).toEqual({ latitude: 42, longitude: -71 })
  expect(getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 })
  getCurrentPosition.mockImplementationOnce((_success, error) => error?.({ code: 1 } as GeolocationPositionError))
  await expect(requestLocation({ getCurrentPosition })).rejects.toThrow('Location access is off')
  getCurrentPosition.mockImplementationOnce((_success, error) => error?.({ code: 3 } as GeolocationPositionError))
  await expect(requestLocation({ getCurrentPosition })).rejects.toThrow('try again')
  getCurrentPosition.mockImplementationOnce(success => success({ coords: { latitude: NaN, longitude: 0 } } as GeolocationPosition))
  await expect(requestLocation({ getCurrentPosition })).rejects.toThrow('could not be found')
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
