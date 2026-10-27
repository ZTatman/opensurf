export const FAVORITES_KEY = "opensurf.favorites.v1";

// Ignores unknown IDs, duplicates, and corrupt or blocked storage.
export function readFavorites(storage: Pick<Storage, "getItem">, knownIds: string[]) {
  try {
    const value: unknown = JSON.parse(storage.getItem(FAVORITES_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value.filter((id): id is string => typeof id === "string" && knownIds.includes(id)),
      ),
    ];
  } catch {
    return [];
  }
}

// Returns false when storage is full or blocked.
export function writeFavorites(storage: Pick<Storage, "setItem">, ids: string[]) {
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}
