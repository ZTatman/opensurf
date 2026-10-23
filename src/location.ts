import { validCoordinates, type Coordinates } from './places'

type LocationSource = Pick<Geolocation, 'getCurrentPosition'>

export function requestLocation(geolocation: LocationSource): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(position => {
      if (!validCoordinates(position.coords)) {
        reject(new Error('Your location could not be found. Search for a city or region instead.'))
        return
      }
      resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude })
    }, error => reject(new Error(error.code === 1
      ? 'Location access is off. Allow it in your browser settings, then reload, or search for a city.'
      : 'Your location could not be found. Reload to try again, or search for a city.')),
    { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 })
  })
}

// Deferring one tick lets React StrictMode cancel its first setup before asking
// permission. Each real page mount requests once; stale callbacks are ignored.
export function startLocationRequest(
  geolocation: LocationSource | undefined,
  onLocated: (point: Coordinates) => void,
  onError: (error: Error) => void,
) {
  let active = true
  const timer = setTimeout(() => {
    if (!active) return
    if (!geolocation) {
      onError(new Error('Location is unavailable in this browser. Search for a city or region instead.'))
      return
    }
    requestLocation(geolocation).then(point => {
      if (active) onLocated(point)
    }).catch(error => {
      if (active) onError(error instanceof Error ? error : new Error('Your location could not be found. Search for a city instead.'))
    })
  }, 0)
  return () => { active = false; clearTimeout(timer) }
}
