import type { PlayerId } from "@genesis-rift/shared";

import type { EquipmentDefinitionCatalog } from "./equipment-attribute-modifiers.ts";
import type { EquipmentActiveAbilityDefinition } from "./equipment-active-ability-definition.ts";
import { getEquippedEquipment, type EquipmentLoadout } from "./equipment-loadout.ts";

/** 描述一件已装备物品的主动能力冷却与使用次数。 */
export interface EquipmentActiveAbilityRuntimeEntry {
  readonly equipmentInstanceId: string;
  readonly abilityId: string;
  readonly remainingCooldownTurns: number;
  readonly usesThisTurn: number;
  readonly totalUses: number;
}

/** 描述角色当前装备主动能力的运行时状态。 */
export interface EquipmentActiveAbilityState {
  readonly ownerId: PlayerId;
  readonly entries: Readonly<Record<string, EquipmentActiveAbilityRuntimeEntry>>;
}

/**
 * 方法名：createEquipmentActiveAbilityState
 * 作用：根据当前装备栏创建所有可主动使用装备的初始冷却状态。
 * @param loadout 当前角色装备栏。
 * @param definitions 装备静态定义注册表。
 * @returns 与装备栏同步的初始主动能力状态。
 * @throws 装备定义不存在或所属者不合法时抛出错误。
 */
export function createEquipmentActiveAbilityState(
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): EquipmentActiveAbilityState {
  return synchronizeEquipmentActiveAbilityState(
    { ownerId: loadout.playerId, entries: {} },
    loadout,
    definitions,
  );
}

/**
 * 方法名：synchronizeEquipmentActiveAbilityState
 * 作用：移除已卸下装备的能力状态，并为新装备主动能力建立运行时条目。
 * @param state 当前装备主动能力运行时状态。
 * @param loadout 当前角色装备栏。
 * @param definitions 装备静态定义注册表。
 * @returns 与当前装备栏一致的新主动能力状态。
 * @throws 状态与装备栏所属者不一致或定义不存在时抛出错误。
 */
export function synchronizeEquipmentActiveAbilityState(
  state: EquipmentActiveAbilityState,
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): EquipmentActiveAbilityState {
  if (state.ownerId !== loadout.playerId) {
    throw new Error("Equipment active ability state does not belong to the loadout player");
  }

  const entries: Record<string, EquipmentActiveAbilityRuntimeEntry> = {};

  for (const equipment of getEquippedEquipment(loadout)) {
    const ability = getEquipmentActiveAbility(definitions, equipment.definitionId);

    if (ability === null) {
      continue;
    }

    const previous = state.entries[equipment.instanceId];
    entries[equipment.instanceId] =
      previous !== undefined && previous.abilityId === ability.abilityId
        ? previous
        : createEquipmentActiveAbilityRuntimeEntry(equipment.instanceId, ability);
  }

  return { ownerId: state.ownerId, entries };
}

/**
 * 方法名：commitEquipmentActiveAbilityUse
 * 作用：记录装备主动能力的本回合使用次数并写入对应冷却。
 * @param state 当前装备主动能力运行时状态。
 * @param equipmentInstanceId 本次使用能力的装备实例标识。
 * @param ability 对应装备的主动能力配置。
 * @returns 更新后的状态和刚提交的能力条目。
 * @throws 装备没有同步能力状态、仍在冷却或达到回合次数上限时抛出错误。
 */
export function commitEquipmentActiveAbilityUse(
  state: EquipmentActiveAbilityState,
  equipmentInstanceId: string,
  ability: EquipmentActiveAbilityDefinition,
): { readonly state: EquipmentActiveAbilityState; readonly entry: EquipmentActiveAbilityRuntimeEntry } {
  const previous = getEquipmentActiveAbilityRuntimeEntry(state, equipmentInstanceId);

  if (previous.abilityId !== ability.abilityId) {
    throw new Error(`Equipment ability does not match runtime entry: ${equipmentInstanceId}`);
  }

  if (previous.remainingCooldownTurns > 0) {
    throw new Error(`Equipment active ability is on cooldown: ${equipmentInstanceId}`);
  }

  if (previous.usesThisTurn >= ability.maxUsesPerTurn) {
    throw new Error(`Equipment active ability usage limit reached: ${equipmentInstanceId}`);
  }

  const entry = {
    ...previous,
    remainingCooldownTurns: ability.cooldownTurns,
    usesThisTurn: previous.usesThisTurn + 1,
    totalUses: previous.totalUses + 1,
  };

  return { state: { ...state, entries: { ...state.entries, [equipmentInstanceId]: entry } }, entry };
}

/**
 * 方法名：advanceEquipmentActiveAbilityStateAtTurnEnd
 * 作用：在所属角色回合结束时递减冷却并重置本回合装备能力使用次数。
 * @param state 当前装备主动能力运行时状态。
 * @returns 完成回合末更新后的状态。
 */
export function advanceEquipmentActiveAbilityStateAtTurnEnd(
  state: EquipmentActiveAbilityState,
): EquipmentActiveAbilityState {
  const entries: Record<string, EquipmentActiveAbilityRuntimeEntry> = {};

  for (const [equipmentInstanceId, entry] of Object.entries(state.entries)) {
    entries[equipmentInstanceId] = {
      ...entry,
      remainingCooldownTurns: Math.max(0, entry.remainingCooldownTurns - 1),
      usesThisTurn: 0,
    };
  }

  return { ...state, entries };
}

/** 读取一件已装备物品配置的主动能力；未定义时返回 null。 */
export function getEquipmentActiveAbility(
  definitions: EquipmentDefinitionCatalog,
  definitionId: string,
): EquipmentActiveAbilityDefinition | null {
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Equipment definition not found: ${definitionId}`);
  }

  return definition.activeAbility ?? null;
}

/** 读取指定装备实例的能力运行时条目。 */
export function getEquipmentActiveAbilityRuntimeEntry(
  state: EquipmentActiveAbilityState,
  equipmentInstanceId: string,
): EquipmentActiveAbilityRuntimeEntry {
  const entry = state.entries[equipmentInstanceId];

  if (entry === undefined) {
    throw new Error(`Equipment active ability is not available: ${equipmentInstanceId}`);
  }

  return entry;
}

/** 为新装备实例创建零冷却、零使用次数的主动能力状态。 */
function createEquipmentActiveAbilityRuntimeEntry(
  equipmentInstanceId: string,
  ability: EquipmentActiveAbilityDefinition,
): EquipmentActiveAbilityRuntimeEntry {
  return {
    equipmentInstanceId,
    abilityId: ability.abilityId,
    remainingCooldownTurns: 0,
    usesThisTurn: 0,
    totalUses: 0,
  };
}
