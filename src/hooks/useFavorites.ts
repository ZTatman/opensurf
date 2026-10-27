import { useState } from "react";
import { cameras } from "../cameras";
import { readFavorites, writeFavorites } from "../lib/favorites";

const knownIds = cameras.map((camera) => camera.id);
const STORAGE_UNAVAILABLE = "Favorites are saved for this visit. Browser storage is unavailable.";

function initialFavorites() {
  try {
    return readFavorites(window.localStorage, knownIds);
  } catch {
    return [];
  }
}

// Saved cameras persist in localStorage; when storage is blocked they last for this visit.
export function useFavorites(onNotice: (message: string) => void) {
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);

  function toggle(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      if (!writeFavorites(window.localStorage, next)) onNotice(STORAGE_UNAVAILABLE);
    } catch {
      onNotice(STORAGE_UNAVAILABLE);
    }
  }

  return { favorites, favoriteIds: new Set(favorites), toggle };
}
