import { useEffect, useState } from "react";
import { loadBeachIndex, type IndexedBeach } from "../cameras";

// The national beach index, loaded the first time `enabled` is true. Empty until then or if loading fails.
export function useBeachIndex(enabled: boolean) {
  const [index, setIndex] = useState<IndexedBeach[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadBeachIndex().then(
      (beaches) => {
        if (active) setIndex(beaches);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [enabled]);
  return index;
}
