import type { EmbeddedCamera } from "../../cameras";
import CameraPlayer from "./CameraPlayer";

type WatchGridProps = {
  cameras: EmbeddedCamera[];
  onRemove: (id: string) => void;
};

// The layout follows the selection count: one wide player, or a two-column grid.
export default function WatchGrid({ cameras, onRemove }: WatchGridProps) {
  if (!cameras.length) return null;
  return (
    <section
      id="watch-window"
      className="mb-8 scroll-mt-40 sm:scroll-mt-28"
      aria-label="Selected cameras"
    >
      <div
        className={
          cameras.length > 1
            ? "players-grid grid grid-cols-1 gap-6 md:grid-cols-2"
            : "mx-auto max-w-4xl"
        }
      >
        {cameras.map((camera) => (
          <CameraPlayer key={camera.id} camera={camera} onRemove={() => onRemove(camera.id)} />
        ))}
      </div>
    </section>
  );
}
