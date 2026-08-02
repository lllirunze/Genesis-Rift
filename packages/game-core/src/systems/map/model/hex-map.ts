import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import { type CubeCoordinateKey, getCubeCoordinateKey } from "../geometry/cube-coordinate-key.ts";
import { generateBaseMapCoordinates } from "../generation/generate-base-map-coordinates.ts";
import { BASE_MAP_MAX_RING, BASE_MAP_TILE_COUNT } from "../map-config.ts";
import { createHexTile, type HexTile } from "./hex-tile.ts";
import type { MapContentDefinitionCatalog } from "./map-content-definition-catalog.ts";
import { validateMapContentDefinitionCatalog } from "./map-content-definition-catalog.ts";

/** 封装该模块的状态与操作入口。 */
export class HexMap {
  readonly tiles: readonly HexTile[];

  private readonly tilesById: ReadonlyMap<TileId, HexTile>;
  private readonly tilesByCoordinate: ReadonlyMap<CubeCoordinateKey, HexTile>;
  private readonly tilesByRing: ReadonlyMap<number, readonly HexTile[]>;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param tiles 方法所需的 tiles 参数。
   * @param tilesById 方法所需的 tilesById 参数。
   * @param tilesByCoordinate 方法所需的 tilesByCoordinate 参数。
   * @param tilesByRing 方法所需的 tilesByRing 参数。
   * @returns 无返回值。
   */
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

  /**
   * 方法名：create
   * 作用：创建并校验该方法所负责的业务对象。
   * @param tiles 方法所需的 tiles 参数。
   * @param definitions 方法所需的 definitions 参数。
   * @returns 本次处理得到的结果。
   */
  static create(tiles: readonly HexTile[], definitions: MapContentDefinitionCatalog): HexMap {
    if (tiles.length !== BASE_MAP_TILE_COUNT) {
      throw new RangeError(`hex map must contain exactly ${BASE_MAP_TILE_COUNT} tiles`);
    }

    validateMapContentDefinitionCatalog(definitions);

    const normalizedTiles: HexTile[] = [];
    const tilesById = new Map<TileId, HexTile>();
    const tilesByCoordinate = new Map<CubeCoordinateKey, HexTile>();
    const mutableTilesByRing = new Map<number, HexTile[]>();

    for (const tile of tiles) {
      const normalizedTile = createHexTile(
        {
          tileId: tile.tileId,
          coordinate: tile.coordinate,
          elevation: tile.elevation,
          terrainDefinitionId: tile.terrainDefinitionId,
          regionDefinitionId: tile.regionDefinitionId,
          passability: tile.passability,
          features: tile.features,
        },
        definitions,
      );

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

  /**
   * 方法名：size
   * 作用：执行该方法负责的单一业务操作。
   * @returns 本次处理得到的结果。
   */
  get size(): number {
    return this.tiles.length;
  }

  /**
   * 方法名：getTileById
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param tileId 方法所需的 tileId 参数。
   * @returns 本次处理得到的结果。
   */
  getTileById(tileId: TileId): HexTile | undefined {
    return this.tilesById.get(tileId);
  }

  /**
   * 方法名：getTileAt
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param coordinate 方法所需的 coordinate 参数。
   * @returns 本次处理得到的结果。
   */
  getTileAt(coordinate: CubeCoordinate): HexTile | undefined {
    return this.tilesByCoordinate.get(getCubeCoordinateKey(coordinate));
  }

  /**
   * 方法名：hasTileAt
   * 作用：判断输入是否满足当前业务条件。
   * @param coordinate 方法所需的 coordinate 参数。
   * @returns 本次处理得到的结果。
   */
  hasTileAt(coordinate: CubeCoordinate): boolean {
    return this.tilesByCoordinate.has(getCubeCoordinateKey(coordinate));
  }

  /**
   * 方法名：getTilesInRing
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param ring 方法所需的 ring 参数。
   * @returns 本次处理得到的结果。
   */
  getTilesInRing(ring: number): readonly HexTile[] {
    if (!Number.isSafeInteger(ring) || ring < 0 || ring > BASE_MAP_MAX_RING) {
      throw new RangeError(`ring must be between 0 and ${BASE_MAP_MAX_RING}`);
    }

    return this.tilesByRing.get(ring)!;
  }
}

/**
 * 方法名：assertCompleteCoordinateSet
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param tilesByCoordinate 方法所需的 tilesByCoordinate 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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
