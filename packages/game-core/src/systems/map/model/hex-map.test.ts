import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { HexMap } from "./hex-map.ts";
import { createHexTile, type HexTile } from "./hex-tile.ts";
import type { MapContentDefinitionCatalog } from "./map-content-definition-catalog.ts";

const MAP_CONTENT_DEFINITIONS = {
  terrains: {
    terrain_000001: {
      definitionId: "terrain_000001",
      name: "Plain",
      tags: ["land"],
      movementCostModifier: 0,
    },
  },
  regions: {
    region_000001: {
      definitionId: "region_000001",
      name: "Wilderness",
      category: "wilderness",
      tags: ["outdoor"],
    },
  },
} as const satisfies MapContentDefinitionCatalog;

const DEFAULT_TILE_CONTENT = {
  terrainDefinitionId: "terrain_000001",
  regionDefinitionId: "region_000001",
  passability: "passable",
} as const;

/**
 * 方法名：createCompleteTileSet
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createCompleteTileSet(): HexTile[] {
  return generateBaseMapCoordinates().map((coordinate) =>
    createHexTile(
      {
        tileId: `tile.${getCubeCoordinateKey(coordinate)}` as TileId,
        coordinate,
        elevation: 0,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    ),
  );
}

describe("HexMap", () => {
  it("indexes a complete ten-ring map by id, coordinate, and ring", () => {
    const map = HexMap.create(createCompleteTileSet(), MAP_CONTENT_DEFINITIONS);
    const centerId = "tile.0,0,0" as TileId;

    expect(map.size).toBe(331);
    expect(map.getTileById(centerId)?.coordinate).toEqual({ x: 0, y: 0, z: 0 });
    expect(map.getTileAt({ x: 0, y: 0, z: 0 })?.tileId).toBe(centerId);
    expect(map.hasTileAt({ x: 10, y: -5, z: -5 })).toBe(true);
    expect(map.hasTileAt({ x: 11, y: -5, z: -6 })).toBe(false);
    expect(map.getTilesInRing(0)).toHaveLength(1);
    expect(map.getTilesInRing(10)).toHaveLength(60);
  });

  it("rejects an incomplete tile set", () => {
    expect(() => HexMap.create(createCompleteTileSet().slice(1), MAP_CONTENT_DEFINITIONS)).toThrow(
      RangeError,
    );
  });

  it("rejects duplicate tile ids", () => {
    const tiles = createCompleteTileSet();
    const original = tiles[1]!;

    tiles[1] = createHexTile(
      {
        tileId: tiles[0]!.tileId,
        coordinate: original.coordinate,
        elevation: original.elevation,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );

    expect(() => HexMap.create(tiles, MAP_CONTENT_DEFINITIONS)).toThrow(/duplicate tileId/);
  });

  it("rejects duplicate coordinates", () => {
    const tiles = createCompleteTileSet();
    const original = tiles[0]!;

    tiles[1] = createHexTile(
      {
        tileId: tiles[1]!.tileId,
        coordinate: original.coordinate,
        elevation: original.elevation,
        ...DEFAULT_TILE_CONTENT,
      },
      MAP_CONTENT_DEFINITIONS,
    );

    expect(() => HexMap.create(tiles, MAP_CONTENT_DEFINITIONS)).toThrow(
      /duplicate tile coordinate/,
    );
  });

  it("rejects stored ring values that disagree with coordinates", () => {
    const tiles = createCompleteTileSet();
    const original = tiles[0]!;

    tiles[0] = { ...original, ring: 1 };

    expect(() => HexMap.create(tiles, MAP_CONTENT_DEFINITIONS)).toThrow(/invalid ring value/);
  });

  it("rejects invalid ring queries", () => {
    const map = HexMap.create(createCompleteTileSet(), MAP_CONTENT_DEFINITIONS);

    expect(() => map.getTilesInRing(-1)).toThrow(RangeError);
    expect(() => map.getTilesInRing(11)).toThrow(RangeError);
    expect(() => map.getTilesInRing(1.5)).toThrow(RangeError);
  });
});
