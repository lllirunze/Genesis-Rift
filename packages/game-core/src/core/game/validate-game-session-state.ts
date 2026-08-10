import { GAME_SESSION_STATE_VERSION } from "./game-session-config.ts";
import type {
  GameSessionState,
  GameSessionValidationContext,
  PlayerSessionState,
} from "./game-session-state.ts";
import { validateCharacterResourceState } from "../../systems/character/index.ts";
import {
  EQUIPMENT_SLOTS,
  getEquipmentTypeForSlot,
  validateEquipmentDefinitions,
  type EquipmentDefinition,
} from "../../systems/equipment/index.ts";
import { validateSharedHandCardZones } from "../../systems/hand/index.ts";
import {
  validateItemDefinitionCatalog,
  validatePlayerInventoryState,
} from "../../systems/inventory/index.ts";
import { isTileExplored, validatePlayerExplorationState } from "../../systems/map/index.ts";
import { RandomManager } from "../../systems/random/index.ts";
import {
  validateBattleSettlementLedger,
  validateCharacterSurvivalState,
  validateCharacterStatusState,
  validateStatusDefinitions,
} from "../../systems/battle/index.ts";
import {
  validateDayNightRuntimeState,
  validateWeatherDeckState,
  validateWeatherDefinitionCatalog,
  validateWeatherDisasterDefinition,
  validateWeatherRuntimeState,
} from "../../systems/environment/index.ts";

/**
 * 方法名：validateGameSessionState
 * 作用：校验完整会话及其角色、物品、装备、手牌、地图、天气和随机状态的一致性。
 * @param state 待校验的完整游戏会话状态。
 * @param context 各子系统校验所需的静态定义集合。
 * @returns 无返回值。
 * @throws 任意状态无效、标识重复或跨系统归属不一致时抛出错误。
 */
export function validateGameSessionState<
  ResourceId extends string,
  DerivedAttribute extends string,
>(
  state: GameSessionState<ResourceId>,
  context: GameSessionValidationContext<ResourceId, DerivedAttribute>,
): void {
  if (state.version !== GAME_SESSION_STATE_VERSION) {
    throw new Error(`Unsupported game session state version: ${state.version as number}`);
  }

  assertNonEmptyString(state.gameId, "gameId");

  if (state.status !== "lobby" && state.status !== "running" && state.status !== "finished") {
    throw new RangeError(`Unsupported game session status: ${state.status as string}`);
  }

  validateStaticDefinitions(context);
  validatePlayerOrder(state);

  const equipmentDefinitions = new Map(
    context.equipmentDefinitions.map((definition) => [definition.definitionId, definition]),
  );
  const itemInstanceIds = new Set<string>();
  const statusInstanceIds = new Set<string>();

  for (const player of state.players) {
    validatePlayerState(
      player,
      state,
      context,
      equipmentDefinitions,
      itemInstanceIds,
      statusInstanceIds,
    );
  }

  validateSharedHandCardZones(
    state.world.handCardDeck,
    state.players.map((player) => player.hand),
    context.handCardCatalog,
  );
  validateBattleSettlementLedger(state.world.battleSettlementLedger);
  validateWeatherRuntimeState(
    state.world.environment.weather,
    context.weatherDefinitions,
    context.weatherDisasterDefinitions,
  );
  validateDayNightRuntimeState(state.world.environment.dayNight);
  validateWeatherDeckState(state.world.environment.weatherDeck);
  RandomManager.restore(state.random);
}

/**
 * 方法名：validateStaticDefinitions
 * 作用：在会话状态校验前统一验证外部静态定义集合。
 * @param context 各子系统使用的静态定义集合。
 * @returns 无返回值。
 * @throws 任意定义无效或重复时抛出错误。
 */
function validateStaticDefinitions<ResourceId extends string, DerivedAttribute extends string>(
  context: GameSessionValidationContext<ResourceId, DerivedAttribute>,
): void {
  validateItemDefinitionCatalog(context.itemDefinitions);
  validateEquipmentDefinitions(context.equipmentDefinitions);
  validateStatusDefinitions(Object.values(context.statusDefinitions));
  validateWeatherDefinitionCatalog(context.weatherDefinitions);

  for (const definition of Object.values(context.weatherDisasterDefinitions)) {
    validateWeatherDisasterDefinition(definition);
  }
}

/**
 * 方法名：validatePlayerOrder
 * 作用：确保玩家顺序与玩家状态集合一一对应且不存在重复标识。
 * @param state 待校验的完整游戏会话状态。
 * @returns 无返回值。
 * @throws 玩家标识重复、缺失或顺序不一致时抛出错误。
 */
function validatePlayerOrder<ResourceId extends string>(state: GameSessionState<ResourceId>): void {
  if (state.playerOrder.length !== state.players.length) {
    throw new Error("Player order must contain every session player exactly once");
  }

  const playerIds = new Set<string>();

  for (let index = 0; index < state.players.length; index += 1) {
    const player = state.players[index]!;
    const orderedPlayerId = state.playerOrder[index];
    assertNonEmptyString(player.playerId, "playerId");

    if (playerIds.has(player.playerId)) {
      throw new Error(`Duplicate player session state: ${player.playerId}`);
    }

    if (orderedPlayerId !== player.playerId) {
      throw new Error(`Player order does not match session player at index ${index}`);
    }

    playerIds.add(player.playerId);
  }
}

/**
 * 方法名：validatePlayerState
 * 作用：校验单名玩家的子系统归属、地图位置及全局实例唯一性。
 * @param player 待校验的完整玩家会话状态。
 * @param session 玩家所属的完整游戏会话状态。
 * @param context 各子系统校验所需的静态定义集合。
 * @param equipmentDefinitions 以定义标识索引的装备定义。
 * @param itemInstanceIds 当前会话已经登记的物品实例标识。
 * @param statusInstanceIds 当前会话已经登记的状态实例标识。
 * @returns 无返回值。
 * @throws 玩家子状态归属错误、实例重复或地图位置无效时抛出错误。
 */
function validatePlayerState<ResourceId extends string, DerivedAttribute extends string>(
  player: PlayerSessionState<ResourceId>,
  session: GameSessionState<ResourceId>,
  context: GameSessionValidationContext<ResourceId, DerivedAttribute>,
  equipmentDefinitions: ReadonlyMap<string, EquipmentDefinition>,
  itemInstanceIds: Set<string>,
  statusInstanceIds: Set<string>,
): void {
  assertPlayerOwnership(player);
  validateCharacterResourceState(player.resources, context.characterResourceDefinitions);
  validateCharacterStatusState(player.statuses, context.statusDefinitions);
  validateCharacterSurvivalState(player.battle.survival);

  if (!Number.isSafeInteger(player.battle.currentShield) || player.battle.currentShield < 0) {
    throw new RangeError(
      `Player current shield must be a non-negative safe integer: ${player.playerId}`,
    );
  }
  validatePlayerInventoryState(player.inventory, context.itemDefinitions);
  validatePlayerExplorationState(player.map.exploration, session.world.map);

  if (session.world.map.getTileById(player.map.currentTileId) === undefined) {
    throw new Error(`Player current tile does not exist: ${player.map.currentTileId}`);
  }

  if (!isTileExplored(player.map.exploration, player.map.currentTileId)) {
    throw new Error(`Player current tile has not been explored: ${player.map.currentTileId}`);
  }

  for (const entry of player.inventory.backpack.entries) {
    registerUniqueId(itemInstanceIds, entry.item.instanceId, "item instance");
  }

  if (player.inventory.temporaryPickup !== null) {
    registerUniqueId(
      itemInstanceIds,
      player.inventory.temporaryPickup.item.instanceId,
      "item instance",
    );
  }

  for (const slot of EQUIPMENT_SLOTS) {
    const equipment = player.equipment.slots[slot];

    if (equipment === null) continue;
    registerUniqueId(itemInstanceIds, equipment.instanceId, "item instance");

    const definition = equipmentDefinitions.get(equipment.definitionId);

    if (definition === undefined) {
      throw new Error(`Missing equipment definition: ${equipment.definitionId}`);
    }

    if (equipment.ownerPlayerId !== player.playerId) {
      throw new Error(`Equipment ${equipment.instanceId} is owned by another player`);
    }

    if (equipment.quantity !== 1) {
      throw new Error(`Equipment ${equipment.instanceId} must have a quantity of one`);
    }

    assertNonEmptyString(equipment.stackCompatibilityKey, "equipment.stackCompatibilityKey");

    if (getEquipmentTypeForSlot(slot) !== definition.type) {
      throw new Error(`Equipment ${equipment.definitionId} cannot occupy slot ${slot}`);
    }
  }

  const firstAccessory = player.equipment.slots.accessory1;
  const secondAccessory = player.equipment.slots.accessory2;

  if (
    firstAccessory !== null &&
    secondAccessory !== null &&
    firstAccessory.definitionId === secondAccessory.definitionId
  ) {
    const definition = equipmentDefinitions.get(firstAccessory.definitionId)!;

    if (!definition.allowDuplicateEquipping) {
      throw new Error(`Duplicate accessory cannot be equipped: ${definition.definitionId}`);
    }
  }

  for (const instance of player.statuses.instances) {
    registerUniqueId(statusInstanceIds, instance.instanceId, "status instance");
  }
}

/**
 * 方法名：assertPlayerOwnership
 * 作用：确保玩家聚合下的所有子状态均属于同一玩家。
 * @param player 待检查的完整玩家会话状态。
 * @returns 无返回值。
 * @throws 任意子状态的玩家或目标标识不一致时抛出错误。
 */
function assertPlayerOwnership<ResourceId extends string>(
  player: PlayerSessionState<ResourceId>,
): void {
  const ownedPlayerIds = [
    player.character.playerId,
    player.resources.playerId,
    player.inventory.backpack.playerId,
    player.equipment.playerId,
    player.hand.playerId,
    player.map.exploration.playerId,
    player.battle.survival.participantId,
  ];

  if (ownedPlayerIds.some((playerId) => playerId !== player.playerId)) {
    throw new Error(`Player session contains state owned by another player: ${player.playerId}`);
  }

  if (player.statuses.targetId !== player.playerId) {
    throw new Error(`Character status target does not match player: ${player.playerId}`);
  }
}

/**
 * 方法名：registerUniqueId
 * 作用：登记需要在整局游戏中保持唯一的实例标识。
 * @param ids 已登记的实例标识集合。
 * @param id 本次需要登记的实例标识。
 * @param label 用于错误信息的实例类别名称。
 * @returns 无返回值。
 * @throws 标识为空或已经被其他实例使用时抛出错误。
 */
function registerUniqueId(ids: Set<string>, id: string, label: string): void {
  assertNonEmptyString(id, label);

  if (ids.has(id)) {
    throw new Error(`Duplicate ${label}: ${id}`);
  }

  ids.add(id);
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验字符串标识包含至少一个非空白字符。
 * @param value 待校验的字符串值。
 * @param field 用于错误信息的字段名称。
 * @returns 无返回值。
 * @throws 输入不是有效的非空字符串时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
