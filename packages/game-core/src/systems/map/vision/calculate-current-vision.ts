import type { TileId } from "@genesis-rift/shared";

import {
  isTileExplored,
  validatePlayerExplorationState,
  type PlayerExplorationState,
} from "../exploration/player-exploration-state.ts";
import { getCubeCoordinateDistance } from "../geometry/cube-coordinate.ts";
import { getHexLineBranches } from "../geometry/hex-line.ts";
import type { HexMap } from "../model/hex-map.ts";
import type { HexTile } from "../model/hex-tile.ts";
import { MAP_TILE_INFORMATION_STATES, TILE_VISIBILITY_HIDDEN_REASONS } from "./vision-config.ts";

/** 描述目标地块不可见时的标准原因。 */
export type TileVisibilityHiddenReason = (typeof TILE_VISIBILITY_HIDDEN_REASONS)[number];

/** 描述地图地块在三层战争迷雾中的信息状态。 */
export type MapTileInformationState = (typeof MAP_TILE_INFORMATION_STATES)[number];

/** 描述当前视野查询使用的地图、观察位置和最终视野值。 */
export interface CalculateCurrentVisionInput {
  readonly map: HexMap;
  readonly observerTileId: TileId;
  readonly explorationState: PlayerExplorationState;
  readonly visionRange: number;
  readonly blockingTileIds?: readonly TileId[];
}

/** 描述一个当前可见地块及系统选中的有效视线路径。 */
export interface VisibleTile {
  readonly tileId: TileId;
  readonly distance: number;
  readonly lineOfSightTileIds: readonly TileId[];
}

/** 描述一个地图地块当前允许向玩家公开的信息层级。 */
export interface MapTileInformation {
  readonly tileId: TileId;
  readonly state: MapTileInformationState;
}

/** 描述指定目标地块的可见性判定结果。 */
export type TileVisibilityEvaluation =
  | {
      readonly visible: true;
      readonly tile: VisibleTile;
    }
  | {
      readonly visible: false;
      readonly tileId: TileId;
      readonly distance: number;
      readonly reason: TileVisibilityHiddenReason;
    };

/** 描述观察者当前可以直接获取动态信息的全部地块。 */
export interface CurrentVisionResult {
  readonly observerTileId: TileId;
  readonly visionRange: number;
  readonly visibleTiles: readonly VisibleTile[];
  readonly visibleTileIds: readonly TileId[];
  readonly tileInformation: readonly MapTileInformation[];
}

/**
 * 方法名：calculateCurrentVision
 * 作用：计算观察者当前能够直接看见的所有已探索地块，不修改探索或地图状态。
 * @param input 地图、观察位置、个人探索记录、最终视野范围和额外遮挡地块。
 * @returns 按距离和地块标识稳定排序的当前可见地块集合。
 * @throws 观察位置、视野范围、探索记录或遮挡地块配置非法时抛出错误。
 */
export function calculateCurrentVision(input: CalculateCurrentVisionInput): CurrentVisionResult {
  const context = createVisionContext(input);
  const visibleTiles = input.explorationState.exploredTileIds
    .map((tileId) => evaluateTileVisibilityWithContext(context, tileId))
    .filter(
      (evaluation): evaluation is Extract<TileVisibilityEvaluation, { readonly visible: true }> =>
        evaluation.visible,
    )
    .map((evaluation) => evaluation.tile)
    .sort(compareVisibleTiles);
  const visibleTileIds = new Set(visibleTiles.map((tile) => tile.tileId));
  const tileInformation = input.map.tiles.map((tile) =>
    Object.freeze({
      tileId: tile.tileId,
      state: getMapTileInformationState(input.explorationState, visibleTileIds, tile.tileId),
    }),
  );

  return Object.freeze({
    observerTileId: input.observerTileId,
    visionRange: input.visionRange,
    visibleTiles: Object.freeze(visibleTiles),
    visibleTileIds: Object.freeze([...visibleTileIds]),
    tileInformation: Object.freeze(tileInformation),
  });
}

/**
 * 方法名：getMapTileInformationState
 * 作用：按照当前可见、已探索但不可见、未知的优先级确定地块信息层级。
 * @param explorationState 当前玩家的个人探索记录。
 * @param visibleTileIds 本次视野计算得到的当前可见地块集合。
 * @param tileId 需要确定信息层级的地图地块标识。
 * @returns 目标地块对应的三层战争迷雾状态。
 */
function getMapTileInformationState(
  explorationState: PlayerExplorationState,
  visibleTileIds: ReadonlySet<TileId>,
  tileId: TileId,
): MapTileInformationState {
  if (visibleTileIds.has(tileId)) {
    return "CURRENTLY_VISIBLE";
  }

  return isTileExplored(explorationState, tileId) ? "EXPLORED_NOT_VISIBLE" : "UNKNOWN";
}

/**
 * 方法名：evaluateTileVisibility
 * 作用：判断指定目标是否已探索、位于视野距离内且至少拥有一条未被阻断的标准视线。
 * @param input 地图、观察位置、个人探索记录、最终视野范围和额外遮挡地块。
 * @param targetTileId 需要判断可见性的目标地块标识。
 * @returns 目标的可见路径，或不可见的标准原因。
 * @throws 观察位置、目标、视野范围、探索记录或遮挡地块配置非法时抛出错误。
 */
export function evaluateTileVisibility(
  input: CalculateCurrentVisionInput,
  targetTileId: TileId,
): TileVisibilityEvaluation {
  const context = createVisionContext(input);

  if (input.map.getTileById(targetTileId) === undefined) {
    throw new Error(`Vision target tile does not exist: ${targetTileId}`);
  }

  return evaluateTileVisibilityWithContext(context, targetTileId);
}

/** 保存单次视野计算中已经完成校验的共享数据。 */
interface VisionContext {
  readonly input: CalculateCurrentVisionInput;
  readonly observerTile: HexTile;
  readonly blockingTileIds: ReadonlySet<TileId>;
}

/**
 * 方法名：createVisionContext
 * 作用：统一校验视野输入并建立可供批量目标复用的查询上下文。
 * @param input 地图、观察位置、个人探索记录、最终视野范围和额外遮挡地块。
 * @returns 已校验的观察地块与遮挡集合。
 */
function createVisionContext(input: CalculateCurrentVisionInput): VisionContext {
  assertNonNegativeSafeInteger(input.visionRange, "visionRange");
  validatePlayerExplorationState(input.explorationState, input.map);

  const observerTile = input.map.getTileById(input.observerTileId);

  if (observerTile === undefined) {
    throw new Error(`Vision observer tile does not exist: ${input.observerTileId}`);
  }

  if (!isTileExplored(input.explorationState, input.observerTileId)) {
    throw new Error(`Vision observer tile has not been explored: ${input.observerTileId}`);
  }

  const blockingTileIds = new Set<TileId>();

  for (const tileId of input.blockingTileIds ?? []) {
    if (input.map.getTileById(tileId) === undefined) {
      throw new Error(`Vision blocking tile does not exist: ${tileId}`);
    }

    if (blockingTileIds.has(tileId)) {
      throw new Error(`Duplicate vision blocking tile id: ${tileId}`);
    }

    blockingTileIds.add(tileId);
  }

  return {
    input,
    observerTile,
    blockingTileIds,
  };
}

/**
 * 方法名：evaluateTileVisibilityWithContext
 * 作用：复用已校验上下文完成单个目标的距离、探索和视线分支判定。
 * @param context 本次批量计算共享的视野上下文。
 * @param targetTileId 需要判断可见性的目标地块标识。
 * @returns 目标的可见路径，或不可见的标准原因。
 */
function evaluateTileVisibilityWithContext(
  context: VisionContext,
  targetTileId: TileId,
): TileVisibilityEvaluation {
  const targetTile = context.input.map.getTileById(targetTileId);

  if (targetTile === undefined) {
    throw new Error(`Vision target tile does not exist: ${targetTileId}`);
  }

  const distance = getCubeCoordinateDistance(
    context.observerTile.coordinate,
    targetTile.coordinate,
  );

  if (!isTileExplored(context.input.explorationState, targetTileId)) {
    return createHiddenEvaluation(targetTileId, distance, "NOT_EXPLORED");
  }

  if (distance > context.input.visionRange) {
    return createHiddenEvaluation(targetTileId, distance, "OUT_OF_RANGE");
  }

  const visibleLine = getHexLineBranches(
    context.observerTile.coordinate,
    targetTile.coordinate,
  ).find((line) => isLineVisible(context, line));

  if (visibleLine === undefined) {
    return createHiddenEvaluation(targetTileId, distance, "LINE_OF_SIGHT_BLOCKED");
  }

  return Object.freeze({
    visible: true,
    tile: Object.freeze({
      tileId: targetTileId,
      distance,
      lineOfSightTileIds: Object.freeze(
        visibleLine.map((coordinate) => requireTileAt(context.input.map, coordinate).tileId),
      ),
    }),
  });
}

/**
 * 方法名：isLineVisible
 * 作用：检查一条标准六边形视线是否完全已探索且未在目标之前遇到遮挡或更高地势。
 * @param context 本次视野计算共享的观察者与遮挡数据。
 * @param line 包含观察起点和目标终点的标准视线坐标序列。
 * @returns 目标能够通过该分支看见时返回 true。
 */
function isLineVisible(
  context: VisionContext,
  line: readonly { x: number; y: number; z: number }[],
): boolean {
  for (let index = 1; index < line.length; index += 1) {
    const tile = requireTileAt(context.input.map, line[index]!);
    const isTarget = index === line.length - 1;

    if (!isTileExplored(context.input.explorationState, tile.tileId)) {
      return false;
    }

    if (isTarget) {
      return true;
    }

    if (
      context.blockingTileIds.has(tile.tileId) ||
      tile.elevation > context.observerTile.elevation
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 方法名：requireTileAt
 * 作用：读取视线路径上的地图地块，并在基础地图数据不完整时立即失败。
 * @param map 当前六边形地图。
 * @param coordinate 视线路径中的立方体坐标。
 * @returns 坐标对应的地图地块。
 * @throws 地图缺少目标坐标时抛出错误。
 */
function requireTileAt(
  map: HexMap,
  coordinate: { readonly x: number; readonly y: number; readonly z: number },
): HexTile {
  const tile = map.getTileAt(coordinate);

  if (tile === undefined) {
    throw new Error(
      `Vision line coordinate is not a map tile: ${coordinate.x},${coordinate.y},${coordinate.z}`,
    );
  }

  return tile;
}

/**
 * 方法名：createHiddenEvaluation
 * 作用：创建格式统一且不可变的目标不可见结果。
 * @param tileId 不可见的目标地块标识。
 * @param distance 观察者与目标之间的六边形距离。
 * @param reason 目标不可见的标准原因。
 * @returns 不可变的目标不可见结果。
 */
function createHiddenEvaluation(
  tileId: TileId,
  distance: number,
  reason: TileVisibilityHiddenReason,
): TileVisibilityEvaluation {
  return Object.freeze({ visible: false, tileId, distance, reason });
}

/**
 * 方法名：compareVisibleTiles
 * 作用：按照距离和地块标识为当前可见地块提供稳定顺序。
 * @param first 第一个当前可见地块。
 * @param second 第二个当前可见地块。
 * @returns 小于零表示第一个地块应排列在前。
 */
function compareVisibleTiles(first: VisibleTile, second: VisibleTile): number {
  if (first.distance !== second.distance) {
    return first.distance - second.distance;
  }

  const firstTileId = String(first.tileId);
  const secondTileId = String(second.tileId);

  return firstTileId < secondTileId ? -1 : firstTileId > secondTileId ? 1 : 0;
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验视野范围是否为可安全参与地图计算的非负整数。
 * @param value 需要校验的数值。
 * @param name 出现在错误信息中的参数名称。
 * @returns 无返回值。
 * @throws 数值不是非负安全整数时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}
