import { expect, it } from "vitest";
import { addCamera } from "./useSelection";

it("never duplicates a camera or exceeds four selections", () => {
  const selected = ["pipeline", "avalon", "bald-head", "ocean-city"];
  expect(addCamera(selected, "anacapa")).toEqual(selected);
  expect(addCamera(["pipeline"], "pipeline")).toEqual(["pipeline"]);
  expect(addCamera(["pipeline"], "avalon")).toEqual(["pipeline", "avalon"]);
  expect(selected).toHaveLength(4);
});
