import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { MAX_TILE_ELEVATION, MIN_TILE_ELEVATION } from "../map-config.ts";
import { createHexTile } from "./hex-tile.ts";

const CENTER_TILE_ID = "tile.center" as TileId;

describe("HexTile", () => {
  it("stores center coordinates and elevation as independent values", () => {
    const tile = createHexTile({
      tileId: CENTER_TILE_ID,
      coordinate: { x: 0, y: 0, z: 0 },
      elevation: 8,
    });

    expect(tile).toEqual({
      tileId: CENTER_TILE_ID,
      coordinate: { x: 0, y: 0, z: 0 },
      ring: 0,
      elevation: 8,
    });
  });

  it("allows different elevations without changing coordinate-derived ring data", () => {
    const lowTile = createHexTile({
      tileId: "tile.low" as TileId,
      coordinate: { x: 2, y: -1, z: -1 },
      elevation: -2,
    });
    const highTile = createHexTile({
      tileId: "tile.high" as TileId,
      coordinate: { x: 2, y: -1, z: -1 },
      elevation: 6,
    });

    expect(lowTile.coordinate).toEqual(highTile.coordinate);
    expect(lowTile.ring).toBe(2);
    expect(highTile.ring).toBe(2);
    expect(lowTile.elevation).toBe(-2);
    expect(highTile.elevation).toBe(6);
  });

  it("accepts the minimum and maximum elevations", () => {
    const minimumTile = createHexTile({
      tileId: "tile.minimum" as TileId,
      coordinate: { x: 0, y: 0, z: 0 },
      elevation: MIN_TILE_ELEVATION,
    });
    const maximumTile = createHexTile({
      tileId: "tile.maximum" as TileId,
      coordinate: { x: 0, y: 0, z: 0 },
      elevation: MAX_TILE_ELEVATION,
    });

    expect(minimumTile.elevation).toBe(-3);
    expect(maximumTile.elevation).toBe(20);
  });

  it("rejects elevations outside the supported range", () => {
    expect(() =>
      createHexTile({
        tileId: CENTER_TILE_ID,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: MIN_TILE_ELEVATION - 1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createHexTile({
        tileId: CENTER_TILE_ID,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: MAX_TILE_ELEVATION + 1,
      }),
    ).toThrow(RangeError);
  });

  it("rejects theoretical outer-boundary coordinates as normal map tiles", () => {
    expect(() =>
      createHexTile({
        tileId: CENTER_TILE_ID,
        coordinate: { x: 11, y: -6, z: -5 },
        elevation: 0,
      }),
    ).toThrow(RangeError);
  });

  it("rejects invalid coordinates, elevations, and empty tile ids", () => {
    expect(() =>
      createHexTile({
        tileId: CENTER_TILE_ID,
        coordinate: { x: 1, y: 1, z: 1 },
        elevation: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createHexTile({
        tileId: CENTER_TILE_ID,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: 1.5,
      }),
    ).toThrow(TypeError);
    expect(() =>
      createHexTile({
        tileId: "" as TileId,
        coordinate: { x: 0, y: 0, z: 0 },
        elevation: 0,
      }),
    ).toThrow(TypeError);
  });
});
