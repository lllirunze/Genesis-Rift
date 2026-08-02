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

function createMap(blockedCoordinateKeys: ReadonlySet<string> = new Set()): HexMap {
  return HexMap.create(
    generateBaseMapCoordinates().map((coordinate) =>
      createHexTile(
        {
          tileId: `tile.${getCubeCoordinateKey(coordinate)}` as TileId,
          coordinate,
          elevation: 0,
          terrainDefinitionId: "terrain.plain",
          regionDefinitionId: "region.wilderness",
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
