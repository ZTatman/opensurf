import { afterEach, expect, it, vi } from 'vitest'
import { requestLocation, startLocationRequest } from './geolocation'

afterEach(() => vi.useRealTimers())

it('requests automatically once when StrictMode replays mount setup', async () => {
  vi.useFakeTimers()
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(success => {
    success({ coords: { latitude: 27.29, longitude: -80.35 } } as GeolocationPosition)
  })
  const success = vi.fn()
  const error = vi.fn()
  const firstCleanup = startLocationRequest({ getCurrentPosition }, success, error)
  firstCleanup()
  const cleanup = startLocationRequest({ getCurrentPosition }, success, error)
  await vi.runAllTimersAsync()
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  expect(success).toHaveBeenCalledExactlyOnceWith({ latitude: 27.29, longitude: -80.35 })
  expect(error).not.toHaveBeenCalled()
  cleanup()
})

it('ignores a late position after unmount or selecting a fallback city', async () => {
  vi.useFakeTimers()
  let deliver: PositionCallback | undefined
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(success => { deliver = success })
  const success = vi.fn()
  const cleanup = startLocationRequest({ getCurrentPosition }, success, vi.fn())
  await vi.advanceTimersByTimeAsync(0)
  cleanup()
  deliver?.({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition)
  await vi.runAllTimersAsync()
  expect(success).not.toHaveBeenCalled()
})

it('offers a fallback when automatic geolocation is unavailable', async () => {
  vi.useFakeTimers()
  const success = vi.fn()
  const error = vi.fn()
  const cleanup = startLocationRequest(undefined, success, error)
  await vi.runAllTimersAsync()
  expect(error).toHaveBeenCalledTimes(1)
  expect(error.mock.calls[0][0].message).toContain('Search for a city')
  expect(success).not.toHaveBeenCalled()
  cleanup()
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
