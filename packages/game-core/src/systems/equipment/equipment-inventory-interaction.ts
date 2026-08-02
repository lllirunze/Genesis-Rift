import type { ItemDefinition, ItemDefinitionCatalog } from "@genesis-rift/shared";

import { getItemDefinition } from "../inventory/backpack-geometry.ts";
import { placeItemInBackpack, removeBackpackItem } from "../inventory/backpack-operations.ts";
import { getBackpackEntry, type BackpackPosition } from "../inventory/backpack-state.ts";
import { validateItemInstance, type ItemInstance } from "../inventory/item-instance.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { validateEquipmentDefinition, type EquipmentDefinition } from "./equipment-definition.ts";
import type { EquipmentDefinitionCatalog } from "./equipment-attribute-modifiers.ts";
import { createEquipmentInstance, type EquipmentInstance } from "./equipment-instance.ts";
import {
  equipEquipment,
  unequipEquipment,
  type EquipmentLoadout,
  type EquipmentSlot,
} from "./equipment-loadout.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface EquipmentInventoryState {
  readonly inventory: PlayerInventoryState;
  readonly loadout: EquipmentLoadout;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface EquipItemFromBackpackInput {
  readonly itemInstanceId: string;
  readonly slot: EquipmentSlot;
  readonly replacedEquipmentPosition?: BackpackPosition;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface UnequipItemToBackpackInput {
  readonly slot: EquipmentSlot;
  readonly targetPosition: BackpackPosition;
}

/**
 * 方法名：equipItemFromBackpack
 * 作用：将目标装备放入兼容栏位并更新角色状态。
 * @param state 当前业务状态。
 * @param input 本次处理的输入数据。
 * @param itemDefinitions 方法所需的 itemDefinitions 参数。
 * @param equipmentDefinitions 方法所需的 equipmentDefinitions 参数。
 * @returns 本次处理得到的结果。
 */
export function equipItemFromBackpack(
  state: EquipmentInventoryState,
  input: EquipItemFromBackpackInput,
  itemDefinitions: ItemDefinitionCatalog,
  equipmentDefinitions: EquipmentDefinitionCatalog,
): EquipmentInventoryState {
  assertMatchingPlayer(state);

  const backpackEntry = getBackpackEntry(state.inventory.backpack, input.itemInstanceId);
  const itemDefinition = getItemDefinition(itemDefinitions, backpackEntry.item.definitionId);
  const equipmentDefinition = getEquipmentDefinition(
    equipmentDefinitions,
    backpackEntry.item.definitionId,
  );

  validateItemInstance(backpackEntry.item, itemDefinition);
  validateCompatibleDefinitions(itemDefinition, equipmentDefinition);

  const equipment = createEquipmentInstanceFromItem(backpackEntry.item);
  const equipmentChange = equipEquipment(state.loadout, input.slot, equipment, equipmentDefinition);

  if (equipmentChange.previousEquipment !== null && input.replacedEquipmentPosition === undefined) {
    throw new Error("replacedEquipmentPosition is required when replacing equipped equipment");
  }

  const removal = removeBackpackItem(state.inventory.backpack, input.itemInstanceId);
  const nextBackpack =
    equipmentChange.previousEquipment === null
      ? removal.backpack
      : placeEquippedItemInBackpack(
          removal.backpack,
          equipmentChange.previousEquipment,
          input.replacedEquipmentPosition!,
          itemDefinitions,
          equipmentDefinitions,
        );

  return {
    inventory: {
      ...state.inventory,
      backpack: nextBackpack,
    },
    loadout: equipmentChange.loadout,
  };
}

/**
 * 方法名：unequipItemToBackpack
 * 作用：卸下目标装备并更新角色状态。
 * @param state 当前业务状态。
 * @param input 本次处理的输入数据。
 * @param itemDefinitions 方法所需的 itemDefinitions 参数。
 * @param equipmentDefinitions 方法所需的 equipmentDefinitions 参数。
 * @returns 本次处理得到的结果。
 */
export function unequipItemToBackpack(
  state: EquipmentInventoryState,
  input: UnequipItemToBackpackInput,
  itemDefinitions: ItemDefinitionCatalog,
  equipmentDefinitions: EquipmentDefinitionCatalog,
): EquipmentInventoryState {
  assertMatchingPlayer(state);

  const equipment = state.loadout.slots[input.slot];

  if (equipment === null) {
    throw new Error(`Equipment slot is empty: ${input.slot}`);
  }

  const nextBackpack = placeEquippedItemInBackpack(
    state.inventory.backpack,
    equipment,
    input.targetPosition,
    itemDefinitions,
    equipmentDefinitions,
  );
  const equipmentChange = unequipEquipment(state.loadout, input.slot);

  return {
    inventory: {
      ...state.inventory,
      backpack: nextBackpack,
    },
    loadout: equipmentChange.loadout,
  };
}

/**
 * 方法名：placeEquippedItemInBackpack
 * 作用：按位置与空间约束移动目标对象。
 * @param backpack 方法所需的 backpack 参数。
 * @param equipment 方法所需的 equipment 参数。
 * @param position 方法所需的 position 参数。
 * @param itemDefinitions 方法所需的 itemDefinitions 参数。
 * @param equipmentDefinitions 方法所需的 equipmentDefinitions 参数。
 * @returns 本次处理得到的结果。
 */
function placeEquippedItemInBackpack(
  backpack: PlayerInventoryState["backpack"],
  equipment: EquipmentInstance,
  position: BackpackPosition,
  itemDefinitions: ItemDefinitionCatalog,
  equipmentDefinitions: EquipmentDefinitionCatalog,
): PlayerInventoryState["backpack"] {
  const itemDefinition = getItemDefinition(itemDefinitions, equipment.definitionId);
  const equipmentDefinition = getEquipmentDefinition(equipmentDefinitions, equipment.definitionId);
  validateCompatibleDefinitions(itemDefinition, equipmentDefinition);

  return placeItemInBackpack(
    backpack,
    createItemInstanceFromEquipment(equipment),
    position,
    itemDefinitions,
  );
}

/**
 * 方法名：createEquipmentInstanceFromItem
 * 作用：创建并校验该方法所负责的业务对象。
 * @param item 方法所需的 item 参数。
 * @returns 本次处理得到的结果。
 */
function createEquipmentInstanceFromItem(item: ItemInstance): EquipmentInstance {
  if (item.quantity !== 1) {
    throw new RangeError(`Equipment item quantity must be 1: ${item.instanceId}`);
  }

  return createEquipmentInstance({
    instanceId: item.instanceId,
    definitionId: item.definitionId,
    ownerPlayerId: item.ownerPlayerId,
    quantity: 1,
    stackCompatibilityKey: item.stackCompatibilityKey,
  });
}

/**
 * 方法名：createItemInstanceFromEquipment
 * 作用：创建并校验该方法所负责的业务对象。
 * @param equipment 方法所需的 equipment 参数。
 * @returns 本次处理得到的结果。
 */
function createItemInstanceFromEquipment(equipment: EquipmentInstance): ItemInstance {
  return { ...equipment };
}

/**
 * 方法名：getEquipmentDefinition
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param definitions 方法所需的 definitions 参数。
 * @param definitionId 目标配置定义标识。
 * @returns 本次处理得到的结果。
 */
function getEquipmentDefinition(
  definitions: EquipmentDefinitionCatalog,
  definitionId: string,
): EquipmentDefinition {
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Missing equipment definition: ${definitionId}`);
  }

  validateEquipmentDefinition(definition);
  return definition;
}

/**
 * 方法名：validateCompatibleDefinitions
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param itemDefinition 方法所需的 itemDefinition 参数。
 * @param equipmentDefinition 方法所需的 equipmentDefinition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateCompatibleDefinitions(
  itemDefinition: ItemDefinition,
  equipmentDefinition: EquipmentDefinition,
): void {
  if (itemDefinition.definitionId !== equipmentDefinition.definitionId) {
    throw new Error("Item and equipment definitions must use the same definitionId");
  }

  if (itemDefinition.category !== "equipment") {
    throw new Error(`Item is not equipment: ${itemDefinition.definitionId}`);
  }

  if (itemDefinition.maximumStack !== 1) {
    throw new Error(`Equipment item maximumStack must be 1: ${itemDefinition.definitionId}`);
  }

  if (itemDefinition.quality !== equipmentDefinition.quality) {
    throw new Error(`Item and equipment quality do not match: ${itemDefinition.definitionId}`);
  }
}

/**
 * 方法名：assertMatchingPlayer
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertMatchingPlayer(state: EquipmentInventoryState): void {
  if (state.inventory.backpack.playerId !== state.loadout.playerId) {
    throw new Error("Inventory and equipment loadout must belong to the same player");
  }
}
