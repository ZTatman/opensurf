import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Coordinates } from '../lib/geo'
import { startLocationRequest } from '../location'

export type SearchArea = Coordinates & { label: string; kind: 'device' | 'place' }

export function useNearby(onLocated: (area: SearchArea) => void) {
  const cleanup = useRef<(() => void) | null>(null)
  const [locating, setLocating] = useState(true)
  const [locationError, setLocationError] = useState('')
  const receiveLocation = useEffectEvent((point: Coordinates) => {
    setLocating(false)
    onLocated({ ...point, label: 'your location', kind: 'device' })
  })

  useEffect(() => {
    const stop = startLocationRequest(navigator.geolocation, receiveLocation, error => {
      setLocating(false)
      setLocationError(error.message)
    })
    cleanup.current = stop
    return stop
  }, [])

  function cancel() {
    cleanup.current?.()
    setLocating(false)
    setLocationError('')
  }

  return { locating, locationError, cancel }
}
