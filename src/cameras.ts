import sourceRecords from "./data/catalog/sources.json";
import beachRecords from "./data/catalog/beaches.json";
import cameraRecords from "./data/catalog/cameras.json";
import {
  buildBeachIndex,
  buildCatalog,
  type BeachRecord,
  type Camera,
  type CameraRecord,
  type EmbeddedCamera,
  type IndexBeachRecord,
  type IndexedBeach,
  type SourceRecord,
} from "./catalog";

export type { Camera, EmbeddedCamera, ExternalCamera, IndexedBeach } from "./catalog";

// Curated snapshots of public listings; see each camera's checkedAt. Coordinates are approximate.
// External listings retain the operator's own player and viewing restrictions.
// JSON imports are typed loosely, so buildCatalog validates every record at load.
export const cameras: Camera[] = buildCatalog(
  sourceRecords as SourceRecord[],
  beachRecords as BeachRecord[],
  cameraRecords as CameraRecord[],
);

// Approved sources that currently supply cameras, in catalog order, for attribution.
export const sources = (sourceRecords as SourceRecord[]).filter((source) =>
  cameras.some((camera) => camera.sourceId === source.id),
);

export const sourceUrl = (camera: Camera) => camera.pageUrl;
export const embedUrl = (camera: EmbeddedCamera) => camera.embedUrl;

export const beaches = cameras.filter((camera) => camera.isBeach);

// Source of the national beach index, credited in the footer.
export const beachIndexSource = (sourceRecords as SourceRecord[]).find(
  (source) => source.id === "epa-beach",
)!;

// The national beach index is about 900 KB, so it loads on first search instead of with the page.
let beachIndex: Promise<IndexedBeach[]> | undefined;
export function loadBeachIndex() {
  beachIndex ??= import("./data/catalog/beaches-epa.json").then((module) =>
    buildBeachIndex(beachRecords as BeachRecord[], module.default as IndexBeachRecord[]),
  );
  return beachIndex;
}
