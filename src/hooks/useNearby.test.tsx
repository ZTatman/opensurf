// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useNearby } from "./useNearby";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("retries a denied location request and delivers the new position", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const getCurrentPosition = vi
    .fn<Geolocation["getCurrentPosition"]>()
    .mockImplementationOnce((_success, error) => error?.({ code: 1 } as GeolocationPositionError))
    .mockImplementationOnce((success) =>
      success({ coords: { latitude: 42, longitude: -71 } } as GeolocationPosition),
    );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  const onLocated = vi.fn();
  let nearby: ReturnType<typeof useNearby> | undefined;
  function Harness() {
    nearby = useNearby(onLocated);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  try {
    await act(async () => root.render(<Harness />));
    await act(async () => vi.runAllTimersAsync());
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(nearby?.locationError).toContain("Location is blocked");
    expect(nearby?.locating).toBe(false);

    await act(async () => nearby?.retry());
    expect(nearby?.locating).toBe(true);
    await act(async () => vi.runAllTimersAsync());
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(onLocated).toHaveBeenCalledExactlyOnceWith({
      latitude: 42,
      longitude: -71,
      label: "your location",
      kind: "device",
    });
    expect(nearby?.locating).toBe(false);
    expect(nearby?.locationError).toBe("");
  } finally {
    await act(async () => root.unmount());
  }
});
