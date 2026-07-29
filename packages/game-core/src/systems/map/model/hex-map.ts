import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import { type CubeCoordinateKey, getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { BASE_MAP_MAX_RING } from "../geometry/cube-coordinate.ts";
import {
  BASE_MAP_TILE_COUNT,
  generateBaseMapCoordinates,
} from "../generation/generate-base-map-coordinates.ts";
import { createHexTile, type HexTile } from "./hex-tile.ts";

export class HexMap {
  readonly tiles: readonly HexTile[];

  private readonly tilesById: ReadonlyMap<TileId, HexTile>;
  private readonly tilesByCoordinate: ReadonlyMap<CubeCoordinateKey, HexTile>;
  private readonly tilesByRing: ReadonlyMap<number, readonly HexTile[]>;

  private constructor(
    tiles: readonly HexTile[],
    tilesById: ReadonlyMap<TileId, HexTile>,
    tilesByCoordinate: ReadonlyMap<CubeCoordinateKey, HexTile>,
    tilesByRing: ReadonlyMap<number, readonly HexTile[]>,
  ) {
    this.tiles = tiles;
    this.tilesById = tilesById;
    this.tilesByCoordinate = tilesByCoordinate;
    this.tilesByRing = tilesByRing;
  }

  static create(tiles: readonly HexTile[]): HexMap {
    if (tiles.length !== BASE_MAP_TILE_COUNT) {
      throw new RangeError(`hex map must contain exactly ${BASE_MAP_TILE_COUNT} tiles`);
    }

    const normalizedTiles: HexTile[] = [];
    const tilesById = new Map<TileId, HexTile>();
    const tilesByCoordinate = new Map<CubeCoordinateKey, HexTile>();
    const mutableTilesByRing = new Map<number, HexTile[]>();

    for (const tile of tiles) {
      const normalizedTile = createHexTile({
        tileId: tile.tileId,
        coordinate: tile.coordinate,
        elevation: tile.elevation,
      });

      if (tile.ring !== normalizedTile.ring) {
        throw new RangeError(`tile ${tile.tileId} has an invalid ring value`);
      }

      if (tilesById.has(normalizedTile.tileId)) {
        throw new RangeError(`duplicate tileId: ${normalizedTile.tileId}`);
      }

      const coordinateKey = getCubeCoordinateKey(normalizedTile.coordinate);

      if (tilesByCoordinate.has(coordinateKey)) {
        throw new RangeError(`duplicate tile coordinate: ${coordinateKey}`);
      }

      normalizedTiles.push(normalizedTile);
      tilesById.set(normalizedTile.tileId, normalizedTile);
      tilesByCoordinate.set(coordinateKey, normalizedTile);

      const ringTiles = mutableTilesByRing.get(normalizedTile.ring) ?? [];
      ringTiles.push(normalizedTile);
      mutableTilesByRing.set(normalizedTile.ring, ringTiles);
    }

    assertCompleteCoordinateSet(tilesByCoordinate);

    const tilesByRing = new Map<number, readonly HexTile[]>();

    for (let ring = 0; ring <= BASE_MAP_MAX_RING; ring += 1) {
      tilesByRing.set(ring, Object.freeze([...(mutableTilesByRing.get(ring) ?? [])]));
    }

    return new HexMap(Object.freeze(normalizedTiles), tilesById, tilesByCoordinate, tilesByRing);
  }

  get size(): number {
    return this.tiles.length;
  }

  getTileById(tileId: TileId): HexTile | undefined {
    return this.tilesById.get(tileId);
  }

  getTileAt(coordinate: CubeCoordinate): HexTile | undefined {
    return this.tilesByCoordinate.get(getCubeCoordinateKey(coordinate));
  }

  hasTileAt(coordinate: CubeCoordinate): boolean {
    return this.tilesByCoordinate.has(getCubeCoordinateKey(coordinate));
  }

  getTilesInRing(ring: number): readonly HexTile[] {
    if (!Number.isSafeInteger(ring) || ring < 0 || ring > BASE_MAP_MAX_RING) {
      throw new RangeError(`ring must be between 0 and ${BASE_MAP_MAX_RING}`);
    }

    return this.tilesByRing.get(ring)!;
  }
}

function assertCompleteCoordinateSet(
  tilesByCoordinate: ReadonlyMap<CubeCoordinateKey, HexTile>,
): void {
  for (const coordinate of generateBaseMapCoordinates()) {
    const coordinateKey = getCubeCoordinateKey(coordinate);

    if (!tilesByCoordinate.has(coordinateKey)) {
      throw new RangeError(`hex map is missing coordinate: ${coordinateKey}`);
    }
  }
}
