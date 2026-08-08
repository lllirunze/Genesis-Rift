import type {
  CharacterResourceDefinitionCatalog,
  GameId,
  ItemDefinitionCatalog,
  PlayerId,
  TileId,
} from "@genesis-rift/shared";

import type { CharacterStatusState, StatusDefinitionCatalog } from "../../systems/battle/index.ts";
import type { CharacterResourceState, CharacterState } from "../../systems/character/index.ts";
import type { EquipmentDefinition, EquipmentLoadout } from "../../systems/equipment/index.ts";
import type {
  HandCardCatalog,
  HandCardDeckState,
  PlayerHandState,
} from "../../systems/hand/index.ts";
import type { PlayerInventoryState } from "../../systems/inventory/index.ts";
import type { HexMap, PlayerExplorationState } from "../../systems/map/index.ts";
import type { RandomManagerState } from "../../systems/random/index.ts";
import type { WeatherDeckState } from "../../systems/environment/index.ts";
import type {
  WeatherDefinitionCatalog,
  WeatherDisasterDefinitionCatalog,
  WeatherRuntimeState,
} from "../../systems/environment/index.ts";
import type { GameStatus } from "./game-state.ts";
import { GAME_SESSION_STATE_VERSION } from "./game-session-config.ts";
import { validateGameSessionState } from "./validate-game-session-state.ts";

export { GAME_SESSION_STATE_VERSION } from "./game-session-config.ts";

/** 描述玩家在地图中的当前位置和个人探索记录。 */
export interface PlayerMapSessionState {
  readonly currentTileId: TileId;
  readonly exploration: PlayerExplorationState;
}

/** 聚合一名玩家在一局游戏中的全部私有与公开运行时状态。 */
export interface PlayerSessionState<ResourceId extends string = string> {
  readonly playerId: PlayerId;
  readonly character: CharacterState;
  readonly resources: CharacterResourceState<ResourceId>;
  readonly statuses: CharacterStatusState;
  readonly inventory: PlayerInventoryState;
  readonly equipment: EquipmentLoadout;
  readonly hand: PlayerHandState;
  readonly map: PlayerMapSessionState;
}

/** 聚合所有玩家共享的地图、手牌牌库与天气牌库状态。 */
export interface WorldSessionState {
  readonly map: HexMap;
  readonly handCardDeck: HandCardDeckState;
  readonly weatherDeck: WeatherDeckState;
  readonly weather: WeatherRuntimeState;
}

/** 表示一局游戏可被保存、校验和替换的完整权威状态。 */
export interface GameSessionState<ResourceId extends string = string> {
  readonly version: typeof GAME_SESSION_STATE_VERSION;
  readonly gameId: GameId;
  readonly status: GameStatus;
  readonly playerOrder: readonly PlayerId[];
  readonly players: readonly PlayerSessionState<ResourceId>[];
  readonly world: WorldSessionState;
  readonly random: RandomManagerState;
}

/** 创建完整游戏会话时需要提供的初始状态。 */
export interface CreateGameSessionStateInput<ResourceId extends string = string> {
  readonly gameId: GameId;
  readonly status?: GameStatus;
  readonly players?: readonly PlayerSessionState<ResourceId>[];
  readonly world: WorldSessionState;
  readonly random: RandomManagerState;
}

/** 深度校验游戏会话时使用的静态定义集合。 */
export interface GameSessionValidationContext<
  ResourceId extends string = string,
  DerivedAttribute extends string = string,
> {
  readonly characterResourceDefinitions: CharacterResourceDefinitionCatalog<
    ResourceId,
    DerivedAttribute
  >;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly equipmentDefinitions: readonly EquipmentDefinition[];
  readonly handCardCatalog: HandCardCatalog;
  readonly statusDefinitions: StatusDefinitionCatalog;
  readonly weatherDefinitions: WeatherDefinitionCatalog;
  readonly weatherDisasterDefinitions: WeatherDisasterDefinitionCatalog;
}

/**
 * 方法名：createGameSessionState
 * 作用：根据已初始化的子系统状态创建一局游戏，并执行完整一致性校验。
 * @param input 会话编号、玩家、世界与随机状态。
 * @param context 校验各子系统状态所需的静态定义集合。
 * @returns 通过校验的新游戏会话状态。
 * @throws 任意子系统状态无效或跨系统归属不一致时抛出错误。
 */
export function createGameSessionState<ResourceId extends string, DerivedAttribute extends string>(
  input: CreateGameSessionStateInput<ResourceId>,
  context: GameSessionValidationContext<ResourceId, DerivedAttribute>,
): GameSessionState<ResourceId> {
  const players = [...(input.players ?? [])];
  const state: GameSessionState<ResourceId> = {
    version: GAME_SESSION_STATE_VERSION,
    gameId: input.gameId,
    status: input.status ?? "lobby",
    playerOrder: players.map((player) => player.playerId),
    players,
    world: input.world,
    random: input.random,
  };

  validateGameSessionState(state, context);
  return state;
}

/**
 * 方法名：getPlayerSessionState
 * 作用：按照玩家标识读取会话中的完整玩家状态。
 * @param state 当前游戏会话状态。
 * @param playerId 需要查找的玩家标识。
 * @returns 对应玩家的完整会话状态。
 * @throws 会话中不存在目标玩家时抛出错误。
 */
export function getPlayerSessionState<ResourceId extends string>(
  state: GameSessionState<ResourceId>,
  playerId: PlayerId,
): PlayerSessionState<ResourceId> {
  const player = state.players.find((candidate) => candidate.playerId === playerId);

  if (player === undefined) {
    throw new Error(`Player session state not found: ${playerId}`);
  }

  return player;
}

/**
 * 方法名：addPlayerSessionState
 * 作用：向会话末尾加入一名玩家，并保持玩家顺序与状态集合一致。
 * @param state 当前游戏会话状态。
 * @param player 待加入的完整玩家状态。
 * @param context 校验新会话状态所需的静态定义集合。
 * @returns 包含新玩家且通过校验的新会话状态。
 * @throws 玩家重复或新状态不满足会话约束时抛出错误。
 */
export function addPlayerSessionState<ResourceId extends string, DerivedAttribute extends string>(
  state: GameSessionState<ResourceId>,
  player: PlayerSessionState<ResourceId>,
  context: GameSessionValidationContext<ResourceId, DerivedAttribute>,
): GameSessionState<ResourceId> {
  if (state.players.some((candidate) => candidate.playerId === player.playerId)) {
    throw new Error(`Duplicate player session state: ${player.playerId}`);
  }

  const nextState: GameSessionState<ResourceId> = {
    ...state,
    playerOrder: [...state.playerOrder, player.playerId],
    players: [...state.players, player],
  };

  validateGameSessionState(nextState, context);
  return nextState;
}

/**
 * 方法名：replacePlayerSessionState
 * 作用：不可变替换一名玩家的完整状态，同时保留原有座位顺序。
 * @param state 当前游戏会话状态。
 * @param player 替换后的完整玩家状态。
 * @param context 校验新会话状态所需的静态定义集合。
 * @returns 完成玩家替换且通过校验的新会话状态。
 * @throws 目标玩家不存在或替换结果不满足会话约束时抛出错误。
 */
export function replacePlayerSessionState<
  ResourceId extends string,
  DerivedAttribute extends string,
>(
  state: GameSessionState<ResourceId>,
  player: PlayerSessionState<ResourceId>,
  context: GameSessionValidationContext<ResourceId, DerivedAttribute>,
): GameSessionState<ResourceId> {
  getPlayerSessionState(state, player.playerId);
  const nextState: GameSessionState<ResourceId> = {
    ...state,
    players: state.players.map((candidate) =>
      candidate.playerId === player.playerId ? player : candidate,
    ),
  };

  validateGameSessionState(nextState, context);
  return nextState;
}
