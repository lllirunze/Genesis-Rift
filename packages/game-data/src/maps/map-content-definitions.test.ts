import { describe, expect, it } from "vitest";

import { getRegionDefinition, getTerrainDefinition } from "@genesis-rift/game-core";

import { MAP_CONTENT_DEFINITION_CATALOG } from "./map-content-definitions.ts";

describe("map content definitions", () => {
  it("provides validated terrain and region definitions", () => {
    expect(
      getTerrainDefinition(MAP_CONTENT_DEFINITION_CATALOG.terrains, "terrain.forest"),
    ).toMatchObject({ name: "Forest", tags: ["land", "vegetation"] });
    expect(
      getRegionDefinition(MAP_CONTENT_DEFINITION_CATALOG.regions, "region.civilized"),
    ).toMatchObject({ name: "Civilized Area", category: "civilized" });
  });
});
