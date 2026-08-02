import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { MAX_TILE_ELEVATION, MIN_TILE_ELEVATION } from "../map-config.ts";
import type { MapContentDefinitionCatalog } from "./map-content-definition-catalog.ts";
import { createHexTile } from "./hex-tile.ts";

const CENTER_TILE_ID = "tile.center" as TileId;
const MAP_CONTENT_DEFINITIONS = {
  terrains: {
    "terrain.plain": {
      definitionId: "terrain.plain",
      name: "Plain",
      tags: ["land"],
    },
  },
  regions: {
    "region.wilderness": {
      definitionId: "region.wilderness",
      name: "Wilderness",
      category: "wilderness",
      tags: ["outdoor"],
    },
  },
} as const satisfies MapContentDefinitionCatalog;

const DEFAULT_TILE_CONTENT = {
  terrainDefinitionId: "terrain.plain",
  regionDefinitionId: "region.wilderness",
  passability: "passable",
} as const;

describe("HexTile", () => {
  it("stores center coordinates and elevation as independent values", () => {
    const tile = createHexTile(
      {
        tileId: CENTER_TILE_ID,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: 8,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );

    expect(tile).toEqual({
      tileId: CENTER_TILE_ID,
      coordinate: { x: 0, y: 0, z: 0 },
      ring: 0,
      elevation: 8,
      ...DEFAULT_TILE_CONTENT,
      features: [],
    });
  });

  it("allows different elevations without changing coordinate-derived ring data", () => {
    const lowTile = createHexTile(
      {
        tileId: "tile.low" as TileId,
        coordinate: { x: 2, y: -1, z: -1 },
        elevation: -2,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );
    const highTile = createHexTile(
      {
        tileId: "tile.high" as TileId,
        coordinate: { x: 2, y: -1, z: -1 },
        elevation: 6,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );

    expect(lowTile.coordinate).toEqual(highTile.coordinate);
    expect(lowTile.ring).toBe(2);
    expect(highTile.ring).toBe(2);
    expect(lowTile.elevation).toBe(-2);
    expect(highTile.elevation).toBe(6);
  });

  it("accepts the minimum and maximum elevations", () => {
    const minimumTile = createHexTile(
      {
        tileId: "tile.minimum" as TileId,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: MIN_TILE_ELEVATION,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );
    const maximumTile = createHexTile(
      {
        tileId: "tile.maximum" as TileId,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: MAX_TILE_ELEVATION,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );

    expect(minimumTile.elevation).toBe(-3);
    expect(maximumTile.elevation).toBe(20);
  });

  it("rejects elevations outside the supported range", () => {
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: MIN_TILE_ELEVATION - 1,
          ...DEFAULT_TILE_CONTENT,
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow(RangeError);
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: MAX_TILE_ELEVATION + 1,
          ...DEFAULT_TILE_CONTENT,
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow(RangeError);
  });

  it("rejects theoretical outer-boundary coordinates as normal map tiles", () => {
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 11, y: -6, z: -5 },
          elevation: 0,
          ...DEFAULT_TILE_CONTENT,
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow(RangeError);
  });

  it("rejects invalid coordinates, elevations, and empty tile ids", () => {
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 1, y: 1, z: 1 },
          elevation: 0,
          ...DEFAULT_TILE_CONTENT,
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow(RangeError);
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: 1.5,
          ...DEFAULT_TILE_CONTENT,
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow(TypeError);
    expect(() =>
      createHexTile(
        {
          tileId: "" as TileId,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: 0,
          ...DEFAULT_TILE_CONTENT,
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow(TypeError);
  });

  it("stores validated features and passability without adding feature-specific behavior", () => {
    const tile = createHexTile(
      {
        tileId: CENTER_TILE_ID,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: 0,
        ...DEFAULT_TILE_CONTENT,
        passability: "blocked",
        features: [
          {
            featureId: "feature.center-event",
            type: "event",
            referenceId: "event.ancient-ruins",
          },
          {
            featureId: "feature.center-portal",
            type: "portal",
            referenceId: "portal.creation-mountain",
          },
        ],
      },
      MAP_CONTENT_DEFINITIONS,
    );

    expect(tile.passability).toBe("blocked");
    expect(tile.features).toHaveLength(2);
    expect(tile.features[1]).toMatchObject({
      type: "portal",
      referenceId: "portal.creation-mountain",
    });
  });

  it("rejects unknown content references, invalid states, and duplicate feature ids", () => {
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: 0,
          ...DEFAULT_TILE_CONTENT,
          terrainDefinitionId: "terrain.unknown",
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow("Unknown terrain definition");
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: 0,
          ...DEFAULT_TILE_CONTENT,
          passability: "unknown" as "passable",
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow("Unsupported tile passability");
    expect(() =>
      createHexTile(
        {
          tileId: CENTER_TILE_ID,
          coordinate: { x: 0, y: 0, z: 0 },
          elevation: 0,
          ...DEFAULT_TILE_CONTENT,
          features: [
            { featureId: "feature.same", type: "npc", referenceId: "npc.merchant" },
            { featureId: "feature.same", type: "resource", referenceId: "resource.iron" },
          ],
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ).toThrow("Duplicate tile feature id");
  });
});
