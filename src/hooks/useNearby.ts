import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Coordinates } from "../lib/geo";
import { startLocationRequest } from "../services/geolocation";

export type SearchArea = Coordinates & { label: string; kind: "device" | "place" };

/**
 * Requests device location on mount and calls onLocated with a device search area on success.
 * Returns the request status and error message, plus controls to cancel or retry the request.
 * Cancel and retry ignore any late result from the previous request.
 */
export function useNearby(onLocated: (area: SearchArea) => void) {
  const cleanup = useRef<(() => void) | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const receiveLocation = useEffectEvent((point: Coordinates) => {
    setLocating(false);
    setLocationError("");
    onLocated({ ...point, label: "your location", kind: "device" });
  });

  useEffect(() => {
    const stop = startLocationRequest(navigator.geolocation, receiveLocation, (error) => {
      setLocating(false);
      setLocationError(error.message);
    });
    cleanup.current = stop;
    return stop;
  }, [attempt]);

  function cancel() {
    cleanup.current?.();
    setLocating(false);
    setLocationError("");
  }

  /** Clears the error and starts another location request. */
  function retry() {
    cleanup.current?.();
    setLocating(true);
    setLocationError("");
    setAttempt((value) => value + 1);
  }

  return { locating, locationError, cancel, retry };
}
