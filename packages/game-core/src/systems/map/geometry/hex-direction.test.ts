import { describe, expect, it } from "vitest";

import { HEX_DIRECTION_DEFINITIONS, HEX_DIRECTIONS, HEX_MAP_CENTER } from "../map-config.ts";
import { createCubeCoordinate } from "./cube-coordinate.ts";
import {
  areCubeCoordinatesAdjacent,
  getAdjacentRingMovementRelation,
  getNeighborCoordinate,
  getNeighborCoordinates,
  isMapBoundaryCoordinate,
  isNormalMapCoordinate,
  isTheoreticalOuterBoundaryCoordinate,
} from "./hex-direction.ts";

describe("flat-top hex directions", () => {
  it("defines clockwise compass bearings from north", () => {
    expect(HEX_DIRECTIONS).toEqual([
      "NORTH",
      "NORTH_EAST_60",
      "SOUTH_EAST_60",
      "SOUTH",
      "SOUTH_WEST_60",
      "NORTH_WEST_60",
    ]);
    expect(
      HEX_DIRECTIONS.map((direction) => HEX_DIRECTION_DEFINITIONS[direction].bearingDegrees),
    ).toEqual([0, 60, 120, 180, 240, 300]);
  });

  it("returns all six neighbors in clockwise visual order", () => {
    expect(getNeighborCoordinates(HEX_MAP_CENTER)).toEqual([
      { x: 0, y: 1, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: -1, z: 0 },
      { x: 0, y: -1, z: 1 },
      { x: -1, y: 0, z: 1 },
      { x: -1, y: 1, z: 0 },
    ]);
  });

  it("calculates a neighbor for each flat-top direction", () => {
    const origin = createCubeCoordinate(2, -1, -1);

    for (const direction of HEX_DIRECTIONS) {
      expect(areCubeCoordinatesAdjacent(origin, getNeighborCoordinate(origin, direction))).toBe(
        true,
      );
    }
  });

  it("distinguishes adjacent and non-adjacent coordinates", () => {
    const neighbor = createCubeCoordinate(1, 0, -1);
    const distant = createCubeCoordinate(2, 0, -2);

    expect(areCubeCoordinatesAdjacent(HEX_MAP_CENTER, neighbor)).toBe(true);
    expect(areCubeCoordinatesAdjacent(neighbor, HEX_MAP_CENTER)).toBe(true);
    expect(areCubeCoordinatesAdjacent(HEX_MAP_CENTER, distant)).toBe(false);
  });

  it("classifies inward, same-ring, and outward adjacent movement", () => {
    const origin = createCubeCoordinate(2, -1, -1);

    expect(
      getAdjacentRingMovementRelation(origin, getNeighborCoordinate(origin, "SOUTH_WEST_60")),
    ).toBe("INWARD");
    expect(getAdjacentRingMovementRelation(origin, getNeighborCoordinate(origin, "NORTH"))).toBe(
      "SAME_RING",
    );
    expect(
      getAdjacentRingMovementRelation(origin, getNeighborCoordinate(origin, "NORTH_EAST_60")),
    ).toBe("OUTWARD");
  });

  it("allows a boundary tile to target the theoretical outer ring", () => {
    const boundary = createCubeCoordinate(10, -5, -5);
    const theoreticalTarget = getNeighborCoordinate(boundary, "NORTH_EAST_60");

    expect(theoreticalTarget).toEqual({ x: 11, y: -5, z: -6 });
    expect(isNormalMapCoordinate(boundary)).toBe(true);
    expect(isMapBoundaryCoordinate(boundary)).toBe(true);
    expect(isMapBoundaryCoordinate(HEX_MAP_CENTER)).toBe(false);
    expect(isMapBoundaryCoordinate(theoreticalTarget)).toBe(false);
    expect(isNormalMapCoordinate(theoreticalTarget)).toBe(false);
    expect(isTheoreticalOuterBoundaryCoordinate(theoreticalTarget)).toBe(true);
    expect(getAdjacentRingMovementRelation(boundary, theoreticalTarget)).toBe("OUTWARD");
  });

  it("does not expand neighbors from a theoretical outer-ring coordinate", () => {
    const theoreticalTarget = createCubeCoordinate(11, -5, -6);

    expect(() => getNeighborCoordinates(theoreticalTarget)).toThrow(RangeError);
  });

  it("rejects ring movement classification for non-adjacent coordinates", () => {
    expect(() =>
      getAdjacentRingMovementRelation(HEX_MAP_CENTER, createCubeCoordinate(2, 0, -2)),
    ).toThrow(RangeError);
  });
});
