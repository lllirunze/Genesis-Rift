import { describe, expect, it } from "vitest";

import {
  BASE_MAP_MAX_RING,
  createCubeCoordinate,
  getCubeCoordinateDistance,
  getCubeCoordinateRing,
  HEX_MAP_CENTER,
  isHexMapCenter,
  MAX_CUBE_COORDINATE,
  MIN_CUBE_COORDINATE,
} from "./cube-coordinate.ts";

describe("cube coordinates", () => {
  it("defines the map center as coordinate 0, 0, 0 in ring zero", () => {
    expect(HEX_MAP_CENTER).toEqual({ x: 0, y: 0, z: 0 });
    expect(isHexMapCenter(HEX_MAP_CENTER)).toBe(true);
    expect(getCubeCoordinateRing(HEX_MAP_CENTER)).toBe(0);
  });

  it("creates valid integer coordinates and derives their ring", () => {
    const coordinate = createCubeCoordinate(-4, 1, 3);

    expect(coordinate).toEqual({ x: -4, y: 1, z: 3 });
    expect(isHexMapCenter(coordinate)).toBe(false);
    expect(getCubeCoordinateRing(coordinate)).toBe(4);
  });

  it("calculates distance from cube coordinate differences", () => {
    const origin = createCubeCoordinate(-2, 1, 1);
    const target = createCubeCoordinate(3, -3, 0);

    expect(getCubeCoordinateDistance(origin, target)).toBe(5);
    expect(getCubeCoordinateDistance(target, origin)).toBe(5);
  });

  it("returns zero when both coordinates are the same", () => {
    const coordinate = createCubeCoordinate(2, -1, -1);

    expect(getCubeCoordinateDistance(coordinate, coordinate)).toBe(0);
  });

  it("calculates distance to theoretical outer-boundary coordinates", () => {
    const boundaryTarget = createCubeCoordinate(11, -6, -5);

    expect(getCubeCoordinateDistance(HEX_MAP_CENTER, boundaryTarget)).toBe(11);
  });

  it("allows theoretical coordinates one ring beyond the normal map boundary", () => {
    const coordinate = createCubeCoordinate(MAX_CUBE_COORDINATE, -6, -5);

    expect(MAX_CUBE_COORDINATE).toBe(BASE_MAP_MAX_RING + 1);
    expect(MIN_CUBE_COORDINATE).toBe(-(BASE_MAP_MAX_RING + 1));
    expect(getCubeCoordinateRing(coordinate)).toBe(11);
  });

  it("rejects coordinates beyond the outer boundary coordinate range", () => {
    expect(() => createCubeCoordinate(MAX_CUBE_COORDINATE + 1, -6, -6)).toThrow(RangeError);
    expect(() => createCubeCoordinate(MIN_CUBE_COORDINATE - 1, 6, 6)).toThrow(RangeError);
  });

  it("rejects coordinates that violate cube coordinate constraints", () => {
    expect(() => createCubeCoordinate(2, 1, 0)).toThrow(RangeError);
    expect(() => createCubeCoordinate(0.5, -0.5, 0)).toThrow(TypeError);
    expect(() => createCubeCoordinate(Number.MAX_SAFE_INTEGER + 1, 0, 0)).toThrow(TypeError);
  });
});
