import type { PlayerId } from "@genesis-rift/shared";

import { EQUIPMENT_SLOTS } from "./equipment-config.ts";
import type { EquipmentDefinition, EquipmentType } from "./equipment-definition.ts";
import type { EquipmentInstance } from "./equipment-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

/** 描述业务对象在运行时保存的状态。 */
export type EquipmentSlotState = Readonly<Record<EquipmentSlot, EquipmentInstance | null>>;

/** 描述当前模块对外公开的业务数据契约。 */
export interface EquipmentLoadout {
  readonly playerId: PlayerId;
  readonly slots: EquipmentSlotState;
}

/** 描述业务操作完成后返回的结果。 */
export interface EquipmentChangeResult {
  readonly loadout: EquipmentLoadout;
  readonly previousEquipment: EquipmentInstance | null;
}

/**
 * 方法名：createEmptyEquipmentLoadout
 * 作用：创建并校验该方法所负责的业务对象。
 * @param playerId 目标玩家标识。
 * @returns 本次处理得到的结果。
 */
export function createEmptyEquipmentLoadout(playerId: PlayerId): EquipmentLoadout {
  return {
    playerId,
    slots: {
      weapon: null,
      armor: null,
      shoes: null,
      accessory1: null,
      accessory2: null,
      special: null,
    },
  };
}

/**
 * 方法名：equipEquipment
 * 作用：将目标装备放入兼容栏位并更新角色状态。
 * @param loadout 方法所需的 loadout 参数。
 * @param slot 方法所需的 slot 参数。
 * @param equipment 方法所需的 equipment 参数。
 * @param definition 方法所需的 definition 参数。
 * @returns 本次处理得到的结果。
 */
export function equipEquipment(
  loadout: EquipmentLoadout,
  slot: EquipmentSlot,
  equipment: EquipmentInstance,
  definition: EquipmentDefinition,
): EquipmentChangeResult {
  if (equipment.ownerPlayerId !== loadout.playerId) {
    throw new Error(`Equipment ${equipment.instanceId} is owned by another player`);
  }

  if (equipment.definitionId !== definition.definitionId) {
    throw new Error(`Equipment ${equipment.instanceId} does not match its definition`);
  }

  if (getEquipmentTypeForSlot(slot) !== definition.type) {
    throw new Error(`Equipment type ${definition.type} cannot be equipped in slot ${slot}`);
  }

  for (const [occupiedSlot, equipped] of getEquipmentEntries(loadout)) {
    if (equipped?.instanceId === equipment.instanceId && occupiedSlot !== slot) {
      throw new Error(`Equipment instance is already equipped: ${equipment.instanceId}`);
    }
  }

  if (definition.type === "accessory" && !definition.allowDuplicateEquipping) {
    const otherAccessorySlot = slot === "accessory1" ? "accessory2" : "accessory1";
    const otherAccessory = loadout.slots[otherAccessorySlot];

    if (otherAccessory?.definitionId === equipment.definitionId) {
      throw new Error(`Duplicate accessory cannot be equipped: ${definition.definitionId}`);
    }
  }

  const previousEquipment = loadout.slots[slot];

  return {
    loadout: {
      ...loadout,
      slots: {
        ...loadout.slots,
        [slot]: equipment,
      },
    },
    previousEquipment,
  };
}

/**
 * 方法名：unequipEquipment
 * 作用：卸下目标装备并更新角色状态。
 * @param loadout 方法所需的 loadout 参数。
 * @param slot 方法所需的 slot 参数。
 * @returns 本次处理得到的结果。
 */
export function unequipEquipment(
  loadout: EquipmentLoadout,
  slot: EquipmentSlot,
): EquipmentChangeResult {
  const previousEquipment = loadout.slots[slot];

  return {
    loadout: {
      ...loadout,
      slots: {
        ...loadout.slots,
        [slot]: null,
      },
    },
    previousEquipment,
  };
}

/**
 * 方法名：getEquippedEquipment
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param loadout 方法所需的 loadout 参数。
 * @returns 本次处理得到的结果。
 */
export function getEquippedEquipment(loadout: EquipmentLoadout): readonly EquipmentInstance[] {
  return getEquipmentEntries(loadout).flatMap(([, equipment]) =>
    equipment === null ? [] : [equipment],
  );
}

/**
 * 方法名：getEquipmentTypeForSlot
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param slot 方法所需的 slot 参数。
 * @returns 本次处理得到的结果。
 */
export function getEquipmentTypeForSlot(slot: EquipmentSlot): EquipmentType {
  if (slot === "accessory1" || slot === "accessory2") {
    return "accessory";
  }

  return slot;
}

/**
 * 方法名：getEquipmentEntries
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param loadout 方法所需的 loadout 参数。
 * @returns 本次处理得到的结果。
 */
function getEquipmentEntries(
  loadout: EquipmentLoadout,
): readonly (readonly [EquipmentSlot, EquipmentInstance | null])[] {
  return EQUIPMENT_SLOTS.map((slot) => [slot, loadout.slots[slot]] as const);
}
