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

export interface EquipmentInventoryState {
  readonly inventory: PlayerInventoryState;
  readonly loadout: EquipmentLoadout;
}

export interface EquipItemFromBackpackInput {
  readonly itemInstanceId: string;
  readonly slot: EquipmentSlot;
  readonly replacedEquipmentPosition?: BackpackPosition;
}

export interface UnequipItemToBackpackInput {
  readonly slot: EquipmentSlot;
  readonly targetPosition: BackpackPosition;
}

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

function createItemInstanceFromEquipment(equipment: EquipmentInstance): ItemInstance {
  return { ...equipment };
}

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

function assertMatchingPlayer(state: EquipmentInventoryState): void {
  if (state.inventory.backpack.playerId !== state.loadout.playerId) {
    throw new Error("Inventory and equipment loadout must belong to the same player");
  }
}
