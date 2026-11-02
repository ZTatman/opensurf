import { err, ok, type Result } from "neverthrow";
import { validCoordinates, type Coordinates } from "./lib/geo";

// Records as stored in src/data/catalog. Beaches, cameras and sources are kept apart so one beach
// can have several views and each source carries its own terms, attribution and access method.
export type SourceRecord = {
  id: string;
  name: string;
  status: "approved" | "rejected";
  access?: "embed" | "external";
  homepage?: string;
  terms?: string;
  pageBase?: string;
  embedBase?: string;
  searchTerms?: string[];
  notes: string;
};

export type BeachRecord = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  aliases?: string[];
  // Matching records in imported indexes, such as "epa:FL123456", so they are not listed twice.
  externalIds?: string[];
};

// One beach from the generated EPA index (src/data/catalog/beaches-epa.json), merged from its monitoring segments.
export type IndexBeachRecord = {
  id: string;
  name: string;
  county?: string;
  region: string;
  latitude: number;
  longitude: number;
  epaIds: string[];
};

// A searchable beach that has no camera in the catalog.
export type IndexedBeach = Omit<IndexBeachRecord, "epaIds"> & { country: string };

// Cameras without a beach (inlets, marinas, river views) carry their own locality and coordinates.
// Cameras on a beach inherit its coordinates unless they set their own.
export type CameraRecord = {
  id: string;
  sourceId: string;
  beachId?: string;
  name: string;
  path?: string;
  watchUrl?: string;
  previewUrl: string;
  locality?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  searchTerms?: string[];
  availabilityNote?: string;
  checkedAt: string;
};

type CameraInfo = {
  id: string;
  sourceId: string;
  sourceName: string;
  beachId?: string;
  name: string;
  beach: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  previewUrl: string;
  isBeach: boolean;
  searchTerms: string[];
  availabilityNote?: string;
  checkedAt: string;
};

export type EmbeddedCamera = CameraInfo & {
  playback: "embed";
  path: string;
  pageUrl: string;
  embedUrl: string;
};
export type ExternalCamera = CameraInfo & {
  playback: "external";
  watchUrl: string;
  pageUrl: string;
};
export type Camera = EmbeddedCamera | ExternalCamera;

type Place = { beach: string; region: string; country: string };

const isHttps = (value: unknown) => {
  try {
    return typeof value === "string" && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

function duplicates(rows: { id: string }[]) {
  const seen = new Set<string>();
  return rows.filter(({ id }) => seen.has(id) || !seen.add(id)).map(({ id }) => id);
}

/** Returns an error for each occurrence of an ID after its first occurrence. */
function collectDuplicateErrors<T extends { id: string }>(rows: T[], label: string): string[] {
  return duplicates(rows).map((id) => `duplicate ${label} ${id}`);
}

/** Returns labeled errors for rows with non-finite or out-of-range coordinates. */
function collectCoordinateErrors<T extends { id: string } & Coordinates>(
  rows: T[],
  label: string,
): string[] {
  const errors: string[] = [];

  for (const row of rows) {
    const { id, ...point } = row as T;
    if (!validCoordinates(point)) {
      errors.push(`${label} ${id}: invalid coordinates`);
    }
  }

  return errors;
}

/** Checks duplicate IDs and beach coordinates before cameras are joined. */
function collectInitialErrors(
  sources: SourceRecord[],
  beaches: BeachRecord[],
  cameras: CameraRecord[],
): string[] {
  return [
    ...collectDuplicateErrors(sources, "source"),
    ...collectDuplicateErrors(beaches, "beach"),
    ...collectDuplicateErrors(cameras, "camera"),
    ...collectCoordinateErrors(beaches, "beach"),
  ];
}

/** Indexes sources and beaches by ID; later records replace earlier records with the same ID. */
function buildCatalogIndexes(sources: SourceRecord[], beaches: BeachRecord[]) {
  return {
    sourcesById: new Map(sources.map((source) => [source.id, source] as const)),
    beachesById: new Map(beaches.map((beach) => [beach.id, beach] as const)),
  };
}

/** Returns the camera's approved source, or an error if it is missing or not approved. */
function resolveSource(
  cam: CameraRecord,
  sourcesById: Map<string, SourceRecord>,
): Result<SourceRecord, string> {
  const source = sourcesById.get(cam.sourceId);

  if (!source) return err(`unknown source ${cam.sourceId}`);
  if (source.status !== "approved") return err(`source ${source.id} is ${source.status}`);
  return ok(source);
}

/** Returns the referenced beach, undefined if none is specified, or an error for an unknown ID. */
function resolveBeach(
  cam: CameraRecord,
  beachesById: Map<string, BeachRecord>,
): Result<BeachRecord | undefined, string> {
  if (cam.beachId === undefined) return ok(undefined);

  const beach = beachesById.get(cam.beachId);
  if (!beach) return err(`unknown beach ${cam.beachId}`);
  return ok(beach);
}

/** Uses the beach's place, or requires the camera's locality, region, and country. */
function resolvePlace(cam: CameraRecord, beach?: BeachRecord): Result<Place, string> {
  if (beach) return ok({ beach: beach.name, region: beach.region, country: beach.country });

  const { locality: beachName, region, country } = cam;
  if (!beachName || !region || !country)
    return err("needs a beach or a locality, region and country");
  return ok({ beach: beachName, region, country });
}

/** Uses each camera coordinate when present, otherwise its beach's, and rejects invalid coordinates. */
function resolveCoordinates(cam: CameraRecord, beach?: BeachRecord): Result<Coordinates, string> {
  const point = {
    latitude: cam.latitude ?? beach?.latitude,
    longitude: cam.longitude ?? beach?.longitude,
  };
  if (!validCoordinates(point)) return err("invalid coordinates");
  return ok(point);
}

/** Combines the resolved place and coordinates with camera, source, and beach metadata. */
function buildCameraInfo(
  cam: CameraRecord,
  source: SourceRecord,
  beach: BeachRecord | undefined,
  place: Place,
  point: Coordinates,
): CameraInfo {
  return {
    id: cam.id,
    sourceId: source.id,
    sourceName: source.name,
    ...(beach ? { beachId: beach.id } : {}),
    name: cam.name,
    beach: place.beach,
    region: place.region,
    country: place.country,
    ...point,
    previewUrl: cam.previewUrl,
    isBeach: !!beach,
    searchTerms: [
      ...(source.searchTerms ?? []),
      ...(beach?.aliases ?? []),
      ...(cam.searchTerms ?? []),
    ],
    ...(cam.availabilityNote ? { availabilityNote: cam.availabilityNote } : {}),
    checkedAt: cam.checkedAt,
  };
}

/** Builds a camera for the source's access method, or returns an error for invalid details. */
function materializeCamera(
  info: CameraInfo,
  cam: CameraRecord,
  source: SourceRecord,
): Result<Camera, string> {
  if (!isHttps(cam.previewUrl)) return err("preview must be an HTTPS URL");

  if (source.access === "embed") {
    if (!cam.path || !isHttps(source.pageBase) || !isHttps(source.embedBase))
      return err("embed sources need a path, pageBase and embedBase");

    return ok({
      ...info,
      playback: "embed",
      path: cam.path,
      pageUrl: source.pageBase + cam.path,
      embedUrl: source.embedBase + cam.path,
    });
  }

  if (source.access === "external") {
    if (!isHttps(cam.watchUrl)) return err("external cameras need an HTTPS watchUrl");

    return ok({
      ...info,
      playback: "external",
      watchUrl: cam.watchUrl!,
      pageUrl: cam.watchUrl!,
    });
  }
  return err(`source ${source.id} has no access method`);
}

/**
 * Joins cameras to approved sources and optional beaches in camera order.
 * Beach coordinates are used for missing camera coordinates. Throws an Error containing
 * the collected validation problems. Each camera contributes at most one joining error;
 * duplicate IDs are reported separately.
 */
export function buildCatalog(
  sources: SourceRecord[],
  beaches: BeachRecord[],
  cameras: CameraRecord[],
): Camera[] {
  const errors = collectInitialErrors(sources, beaches, cameras);
  const { sourcesById, beachesById } = buildCatalogIndexes(sources, beaches);
  const joinedCameras: Camera[] = [];

  for (const cam of cameras) {
    const sourceRes = resolveSource(cam, sourcesById);
    if (sourceRes.isErr()) {
      errors.push(`camera ${cam.id}: ${sourceRes.error}`);
      continue;
    }
    const source = sourceRes.value;

    const beachRes = resolveBeach(cam, beachesById);
    if (beachRes.isErr()) {
      errors.push(`camera ${cam.id}: ${beachRes.error}`);
      continue;
    }
    const beach = beachRes.value;

    const placeRes = resolvePlace(cam, beach);
    if (placeRes.isErr()) {
      errors.push(`camera ${cam.id}: ${placeRes.error}`);
      continue;
    }
    const place = placeRes.value;

    const coordRes = resolveCoordinates(cam, beach);
    if (coordRes.isErr()) {
      errors.push(`camera ${cam.id}: ${coordRes.error}`);
      continue;
    }
    const point = coordRes.value;

    const info = buildCameraInfo(cam, source, beach, place, point);
    const camRes = materializeCamera(info, cam, source);

    if (camRes.isErr()) {
      errors.push(`camera ${cam.id}: ${camRes.error}`);
      continue;
    }

    joinedCameras.push(camRes.value);
  }

  if (errors.length) throw new Error(`Invalid camera catalog:\n${errors.join("\n")}`);
  return joinedCameras;
}

/**
 * Lists index beaches not covered by curated EPA links, assigning them country "USA".
 * Throws an Error for duplicate index IDs, invalid index coordinates, unresolved curated
 * links, or listed index IDs that collide with curated beach IDs.
 */
export function buildBeachIndex(curated: BeachRecord[], index: IndexBeachRecord[]): IndexedBeach[] {
  const errors = [
    ...collectDuplicateErrors(index, "index beach"),
    ...collectCoordinateErrors(index, "index beach"),
  ];

  const known = new Set(index.flatMap((beach) => beach.epaIds.map((id) => `epa:${id}`)));
  const linked = new Set(curated.flatMap((beach) => beach.externalIds ?? []));

  for (const beach of curated) {
    for (const id of beach.externalIds ?? []) {
      if (!known.has(id)) errors.push(`beach ${beach.id}: ${id} is not in the index`);
    }
  }
  const curatedIds = new Set(curated.map((beach) => beach.id));
  const listed = index.filter((beach) => !beach.epaIds.some((id) => linked.has(`epa:${id}`)));
  errors.push(
    ...listed
      .filter((beach) => curatedIds.has(beach.id))
      .map((beach) => `index beach ${beach.id} duplicates a curated beach ID`),
  );

  if (errors.length) throw new Error(`Invalid beach index:\n${errors.join("\n")}`);

  return listed.map(({ id, name, county, region, latitude, longitude }) => ({
    id,
    name,
    ...(county ? { county } : {}),
    region,
    country: "USA",
    latitude,
    longitude,
  }));
}
