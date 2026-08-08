import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { HEX_DIRECTIONS } from "../map-config.ts";
import { HexMap } from "../model/hex-map.ts";
import { createHexTile } from "../model/hex-tile.ts";
import type { MapContentDefinitionCatalog } from "../model/map-content-definition-catalog.ts";
import {
  evaluateNormalMovementDirections,
  getNormalMovementCandidates,
} from "./normal-movement.ts";

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

describe("normal movement", () => {
  it("offers all six directions from the center without a default direction", () => {
    const map = createMap();
    const candidates = getNormalMovementCandidates(map, { x: 0, y: 0, z: 0 });

    expect(candidates.map((candidate) => candidate.direction)).toEqual(HEX_DIRECTIONS);
    expect(candidates).toHaveLength(6);
    expect(candidates.every((candidate) => candidate.ringRelation === "OUTWARD")).toBe(true);
    expect(candidates.map((candidate) => candidate.targetCoordinate)).toEqual([
      { x: 0, y: 1, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: -1, z: 0 },
      { x: 0, y: -1, z: 1 },
      { x: -1, y: 0, z: 1 },
      { x: -1, y: 1, z: 0 },
    ]);
  });

  it("describes inward, same-ring, and outward choices without restricting ring changes", () => {
    const map = createMap();
    const candidates = getNormalMovementCandidates(map, { x: 2, y: -1, z: -1 });

    expect(candidates.map((candidate) => candidate.ringRelation)).toEqual([
      "SAME_RING",
      "OUTWARD",
      "OUTWARD",
      "SAME_RING",
      "INWARD",
      "INWARD",
    ]);
  });

  it("filters blocked targets while preserving an explicit unavailable reason", () => {
    const map = createMap(new Set(["0,1,-1"]));
    const evaluations = evaluateNormalMovementDirections(map, { x: 0, y: 0, z: 0 });
    const candidates = getNormalMovementCandidates(map, { x: 0, y: 0, z: 0 });

    expect(evaluations[0]).toEqual({
      available: false,
      direction: "NORTH",
      targetCoordinate: { x: 0, y: 1, z: -1 },
      reason: "BLOCKED",
    });
    expect(candidates).toHaveLength(5);
    expect(candidates.some((candidate) => candidate.direction === "NORTH")).toBe(false);
  });

  it("allows elevation differences of three and rejects steeper ascent or descent", () => {
    const allowedMap = createMap(
      new Set(),
      new Map([
        ["0,1,-1", 3],
        ["0,-1,1", -3],
      ]),
    );
    const steepMap = createMap(
      new Set(),
      new Map([
        ["0,0,0", 1],
        ["0,1,-1", 5],
        ["0,-1,1", -3],
      ]),
    );

    expect(getNormalMovementCandidates(allowedMap, { x: 0, y: 0, z: 0 })).toHaveLength(6);
    expect(evaluateNormalMovementDirections(steepMap, { x: 0, y: 0, z: 0 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          direction: "NORTH",
          available: false,
          reason: "ELEVATION_DIFFERENCE",
        }),
        expect.objectContaining({
          direction: "SOUTH",
          available: false,
          reason: "ELEVATION_DIFFERENCE",
        }),
      ]),
    );
  });

  it("reports outer-ring directions as outside the map", () => {
    const map = createMap();
    const evaluations = evaluateNormalMovementDirections(map, { x: 10, y: -5, z: -5 });

    expect(evaluations.filter((evaluation) => !evaluation.available)).toEqual([
      {
        available: false,
        direction: "NORTH_EAST_60",
        targetCoordinate: { x: 11, y: -5, z: -6 },
        reason: "OUTSIDE_MAP",
      },
      {
        available: false,
        direction: "SOUTH_EAST_60",
        targetCoordinate: { x: 11, y: -6, z: -5 },
        reason: "OUTSIDE_MAP",
      },
    ]);
    expect(getNormalMovementCandidates(map, { x: 10, y: -5, z: -5 })).toHaveLength(4);
  });

  it("rejects a theoretical outer coordinate as a normal movement origin", () => {
    const map = createMap();

    expect(() => getNormalMovementCandidates(map, { x: 11, y: -5, z: -6 })).toThrow(
      "Normal movement origin is not a map tile",
    );
  });
});

/**
 * 方法名：createMap
 * 作用：创建并校验该方法所负责的业务对象。
 * @param blockedCoordinateKeys 方法所需的 blockedCoordinateKeys 参数。
 * @param elevations 按坐标覆盖默认地块高度的映射。
 * @returns 本次处理得到的结果。
 */
function createMap(
  blockedCoordinateKeys: ReadonlySet<string> = new Set(),
  elevations: ReadonlyMap<string, number> = new Map(),
): HexMap {
  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) =>
      createHexTile(
        {
          tileId: `tile.${getCubeCoordinateKey(coordinate)}` as TileId,
          coordinate,
          elevation: elevations.get(getCubeCoordinateKey(coordinate)) ?? 0,
          terrainDefinitionId: "terrain_000001",
          regionDefinitionId: "region_000001",
          passability: blockedCoordinateKeys.has(getCubeCoordinateKey(coordinate))
            ? "blocked"
            : "passable",
        },
        MAP_CONTENT_DEFINITIONS,
      ),
    ),
    MAP_CONTENT_DEFINITIONS,
  );
}
