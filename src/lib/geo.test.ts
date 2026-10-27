import { describe, expect, it } from "vitest";
import { cameras } from "../cameras";
import { beachSections, distanceKm, nearbyCameras, validCoordinates } from "./geo";

const boston = { latitude: 42.36, longitude: -71.06 };
const portStLucie = { latitude: 27.29393, longitude: -80.35033 };

describe("distances", () => {
  it("ranks cameras by distance and excludes cameras outside the radius", () => {
    const results = nearbyCameras(cameras, boston, 100);
    expect(results.map(({ camera }) => camera.id)).toEqual(["salisbury", "cahoon-hollow"]);
    expect(results[0].distanceKm).toBeGreaterThan(50);
    expect(results[0].distanceKm).toBeLessThan(65);
    expect(nearbyCameras(cameras, boston, 25)).toEqual([]);
    expect(nearbyCameras(cameras, boston, 250).map(({ camera }) => camera.id)).toContain(
      "georgica",
    );
  });
  it("handles coincident, antimeridian and antipodal coordinates", () => {
    expect(distanceKm(boston, boston)).toBe(0);
    expect(
      distanceKm({ latitude: 0, longitude: 179 }, { latitude: 0, longitude: -179 }),
    ).toBeCloseTo(222.39, 1);
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(
      20015.11,
      1,
    );
    expect(nearbyCameras(cameras, { latitude: NaN, longitude: 0 }, 100)).toEqual([]);
    expect(nearbyCameras(cameras, boston, -1)).toEqual([]);
  });
  it("validates coordinates", () => {
    expect(validCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
    expect(validCoordinates({ latitude: "42", longitude: 0 })).toBe(false);
    expect(validCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
  });
  it("includes the official St. Lucie sources within 25 miles of Port St. Lucie", () => {
    const local = nearbyCameras(cameras, { latitude: 27.2939, longitude: -80.3503 }, 25);
    expect(local).toHaveLength(6);
    expect(local.every(({ camera }) => camera.id.startsWith("stlucie-"))).toBe(true);
    expect(local[0].camera.id).toBe("stlucie-boardwalk");
    expect(local.at(-1)!.distanceKm).toBeLessThan(25);
  });
});

describe("homepage beach carousels", () => {
  it("keeps nearby beaches inside 25 miles and puts all other beaches in Explore", () => {
    const { nearby, explore } = beachSections(cameras, portStLucie);
    expect(new Set(nearby.map(({ camera }) => camera.id))).toEqual(
      new Set(["stlucie-surf", "stlucie-beach", "stlucie-jetty"]),
    );
    expect(nearby.every(({ distanceKm }) => distanceKm <= 25 * 1.609344)).toBe(true);
    const nearbyIds = new Set(nearby.map(({ camera }) => camera.id));
    expect(explore.every((camera) => !nearbyIds.has(camera.id))).toBe(true);
    expect(explore.map((camera) => camera.id)).toContain("deerfield");
    expect(
      [...nearby.map(({ camera }) => camera), ...explore].every((camera) => camera.isBeach),
    ).toBe(true);
    expect(nearby.length + explore.length).toBe(cameras.filter((camera) => camera.isBeach).length);
  });
  it("shows no nearby beaches before a location is provided", () => {
    const sections = beachSections(cameras, null);
    expect(sections.nearby).toEqual([]);
    expect(sections.explore).toHaveLength(29);
    expect(beachSections(cameras, { latitude: 0, longitude: 0 }).nearby).toEqual([]);
  });
  it("moves beaches between Nearby and Explore when the range changes", () => {
    const narrow = beachSections(cameras, portStLucie, 10);
    const normal = beachSections(cameras, portStLucie, 25);
    const wide = beachSections(cameras, portStLucie, 100);
    expect(narrow.nearby).toEqual([]);
    expect(normal.nearby).toHaveLength(3);
    expect(wide.nearby).toHaveLength(4);
    expect(normal.explore.some((camera) => camera.id === "deerfield")).toBe(true);
    expect(wide.explore.some((camera) => camera.id === "deerfield")).toBe(false);
    expect(narrow.explore.length).toBe(wide.explore.length + wide.nearby.length);
  });
});
