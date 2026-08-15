import { describe, expect, it } from "vitest";

import { getRegionDefinition, getTerrainDefinition } from "@genesis-rift/game-core";

import { MAP_CONTENT_DEFINITION_CATALOG } from "./map-content-definitions.ts";

describe("map content definitions", () => {
  it("provides validated terrain and region definitions", () => {
    expect(
      getTerrainDefinition(MAP_CONTENT_DEFINITION_CATALOG.terrains, "terrain_000002"),
    ).toMatchObject({ name: "Forest", tags: ["land", "vegetation"] });
    expect(
      getTerrainDefinition(MAP_CONTENT_DEFINITION_CATALOG.terrains, "terrain_000005"),
    ).toMatchObject({ name: "Desert", tags: ["land", "arid"] });
    expect(
      getTerrainDefinition(MAP_CONTENT_DEFINITION_CATALOG.terrains, "terrain_000006"),
    ).toMatchObject({ name: "Snow", tags: ["land", "cold"] });
    expect(
      getRegionDefinition(MAP_CONTENT_DEFINITION_CATALOG.regions, "region_000002"),
    ).toMatchObject({ name: "Civilized Area", category: "civilized" });
  });
});
