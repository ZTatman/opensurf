// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import BeachSearch from "./BeachSearch";

vi.mock("../../hooks/useBeachIndex", () => ({ useBeachIndex: () => [] }));
vi.mock("../../hooks/usePlaceSearch", () => ({
  usePlaceSearch: () => ({ status: "ready", places: [] }),
}));

afterEach(() => vi.unstubAllGlobals());

it("keeps region suggestions matched by country visible in the grouped list", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <BeachSearch
          query="USA"
          onQueryChange={vi.fn()}
          onWatch={vi.fn()}
          onPlace={vi.fn()}
          onRegion={vi.fn()}
          onSearch={vi.fn()}
          hasSelectedPlace={false}
          hasDeviceLocation={true}
          locating={false}
          onUseLocation={vi.fn()}
        />,
      );
    });
    const input = container.querySelector("input")!;
    await act(async () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(document.body.textContent).toContain("Regions");
    expect(document.body.textContent).toContain("Hawaii");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
