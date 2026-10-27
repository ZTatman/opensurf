import { useState } from "react";
import { cameras, sourceUrl, type EmbeddedCamera } from "../cameras";
import { scrollBehavior } from "../lib/motion";

export const MAX_CAMERAS = 4;

// Adds a camera unless it is already selected or the grid is full.
export function addCamera(selected: string[], id: string) {
  if (selected.includes(id) || selected.length >= MAX_CAMERAS) return selected;
  return [...selected, id];
}

const cameraById = new Map(cameras.map((camera) => [camera.id, camera]));

export function revealPlayers() {
  requestAnimationFrame(() => {
    document.getElementById("watch-window")?.scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
  });
}

// The cameras in the watch grid. Watching replaces the selection; comparing adds up to MAX_CAMERAS.
// External cameras open the operator's page instead of joining the grid.
export function useSelection(onNotice: (message: string) => void) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedIds = new Set(selected);
  const viewing = selected
    .map((id) => cameraById.get(id))
    .filter((camera): camera is EmbeddedCamera => camera?.playback === "embed");

  function remove(id: string) {
    setSelected((current) => current.filter((value) => value !== id));
    onNotice("");
  }

  function toggle(id: string) {
    if (selectedIds.has(id)) return remove(id);
    if (selected.length >= MAX_CAMERAS) {
      onNotice("Four cameras selected. Remove one to add another.");
      return;
    }
    setSelected((current) => addCamera(current, id));
    onNotice("");
    if (selected.length === 0) revealPlayers();
  }

  function watch(id: string) {
    const camera = cameraById.get(id);
    if (!camera) return;
    if (camera.playback === "external") {
      window.open(sourceUrl(camera), "_blank", "noopener,noreferrer");
      return;
    }
    setSelected([id]);
    onNotice("");
    revealPlayers();
  }

  return { selectedIds, count: selected.length, viewing, toggle, remove, watch };
}
