import type { PlayerId, TileId } from "@genesis-rift/shared";

import type { HexMap } from "../model/hex-map.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface PlayerExplorationState {
  readonly playerId: PlayerId;
  readonly exploredTileIds: readonly TileId[];
}

/** 描述业务操作完成后返回的结果。 */
export interface SuccessfulTileEntryResult {
  readonly explorationState: PlayerExplorationState;
  readonly enteredTileId: TileId;
  readonly isFirstExploration: boolean;
}

/**
 * 方法名：createPlayerExplorationState
 * 作用：创建并校验该方法所负责的业务对象。
 * @param playerId 目标玩家标识。
 * @param spawnTileId 方法所需的 spawnTileId 参数。
 * @param map 方法所需的 map 参数。
 * @returns 本次处理得到的结果。
 */
export function createPlayerExplorationState(
  playerId: PlayerId,
  spawnTileId: TileId,
  map: HexMap,
): PlayerExplorationState {
  assertNonEmptyString(playerId, "playerId");
  requireMapTile(map, spawnTileId);

  return Object.freeze({
    playerId,
    exploredTileIds: Object.freeze([spawnTileId]),
  });
}

/**
 * 方法名：isTileExplored
 * 作用：判断输入是否满足当前业务条件。
 * @param state 当前业务状态。
 * @param tileId 方法所需的 tileId 参数。
 * @returns 本次处理得到的结果。
 */
export function isTileExplored(state: PlayerExplorationState, tileId: TileId): boolean {
  return state.exploredTileIds.includes(tileId);
}

/**
 * 方法名：canTileEnterVision
 * 作用：判断输入是否满足当前业务条件。
 * @param state 当前业务状态。
 * @param tileId 方法所需的 tileId 参数。
 * @returns 本次处理得到的结果。
 */
export function canTileEnterVision(state: PlayerExplorationState, tileId: TileId): boolean {
  return isTileExplored(state, tileId);
}

/**
 * 方法名：recordSuccessfulTileEntry
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param enteredTileId 方法所需的 enteredTileId 参数。
 * @param map 方法所需的 map 参数。
 * @returns 本次处理得到的结果。
 */
export function recordSuccessfulTileEntry(
  state: PlayerExplorationState,
  enteredTileId: TileId,
  map: HexMap,
): SuccessfulTileEntryResult {
  validatePlayerExplorationState(state, map);
  requireMapTile(map, enteredTileId);

  if (isTileExplored(state, enteredTileId)) {
    return Object.freeze({
      explorationState: state,
      enteredTileId,
      isFirstExploration: false,
    });
  }

  return Object.freeze({
    explorationState: Object.freeze({
      ...state,
      exploredTileIds: Object.freeze([...state.exploredTileIds, enteredTileId]),
    }),
    enteredTileId,
    isFirstExploration: true,
  });
}

/**
 * 方法名：validatePlayerExplorationState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @param map 方法所需的 map 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validatePlayerExplorationState(state: PlayerExplorationState, map: HexMap): void {
  assertNonEmptyString(state.playerId, "playerId");

  if (state.exploredTileIds.length === 0) {
    throw new Error("Player exploration state must contain at least one explored tile");
  }

  const uniqueTileIds = new Set<TileId>();

  for (const tileId of state.exploredTileIds) {
    requireMapTile(map, tileId);

    if (uniqueTileIds.has(tileId)) {
      throw new Error(`Duplicate explored tile id: ${tileId}`);
    }

    uniqueTileIds.add(tileId);
  }
}

/**
 * 方法名：requireMapTile
 * 作用：执行该方法负责的单一业务操作。
 * @param map 方法所需的 map 参数。
 * @param tileId 方法所需的 tileId 参数。
 * @returns 无返回值。
 */
function requireMapTile(map: HexMap, tileId: TileId): void {
  assertNonEmptyString(tileId, "tileId");

  if (map.getTileById(tileId) === undefined) {
    throw new Error(`Unknown exploration tile: ${tileId}`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
