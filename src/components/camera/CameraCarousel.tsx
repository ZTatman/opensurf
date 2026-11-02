import type { ReactNode } from "react";
import Carousel from "../ui/Carousel";
import CameraCard, { type CameraActions } from "./CameraCard";
import type { Camera } from "../../cameras";

type CameraCarouselProps = {
  title: string;
  description: string;
  entries: { camera: Camera; distanceKm?: number }[];
  actions: CameraActions;
  empty: ReactNode;
  action?: ReactNode;
  status?: ReactNode;
};

export default function CameraCarousel({
  title,
  description,
  entries,
  actions,
  empty,
  action,
  status,
}: CameraCarouselProps) {
  return (
    <Carousel
      title={title}
      description={description}
      label={`${title} cameras`}
      empty={empty}
      action={action}
      status={status}
    >
      {entries.map(({ camera, distanceKm }) => (
        <CameraCard key={camera.id} camera={camera} distanceKm={distanceKm} actions={actions} />
      ))}
    </Carousel>
  );
}
