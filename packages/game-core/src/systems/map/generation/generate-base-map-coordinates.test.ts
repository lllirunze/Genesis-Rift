import { describe, expect, it } from "vitest";

import { getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { getCubeCoordinateRing } from "../geometry/cube-coordinate.ts";
import { BASE_MAP_TILE_COUNT } from "../map-config.ts";
import {
  generateBaseMapCoordinates,
  getCompleteHexMapTileCount,
} from "./generate-base-map-coordinates.ts";

describe("base map coordinate generation", () => {
  it("generates the complete ten-ring coordinate set", () => {
    const coordinates = generateBaseMapCoordinates();

    expect(BASE_MAP_TILE_COUNT).toBe(331);
    expect(coordinates).toHaveLength(331);
    expect(coordinates[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(new Set(coordinates.map(getCubeCoordinateKey)).size).toBe(331);
  });

  it("generates the expected number of coordinates in every ring", () => {
    const coordinates = generateBaseMapCoordinates();

    for (let ring = 0; ring <= 10; ring += 1) {
      const expectedCount = ring === 0 ? 1 : 6 * ring;

      expect(
        coordinates.filter((coordinate) => getCubeCoordinateRing(coordinate) === ring),
      ).toHaveLength(expectedCount);
    }
  });

  it("calculates complete hex-map sizes", () => {
    expect(getCompleteHexMapTileCount(0)).toBe(1);
    expect(getCompleteHexMapTileCount(1)).toBe(7);
    expect(getCompleteHexMapTileCount(10)).toBe(331);
    expect(() => getCompleteHexMapTileCount(-1)).toThrow(TypeError);
    expect(() => getCompleteHexMapTileCount(1.5)).toThrow(TypeError);
    expect(() => getCompleteHexMapTileCount(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
