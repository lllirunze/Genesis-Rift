import type { PlayerId } from "@genesis-rift/shared";

import type { EquipmentDefinition, EquipmentType } from "./equipment-definition.ts";
import type { EquipmentInstance } from "./equipment-instance.ts";

export const EQUIPMENT_SLOTS = [
  "weapon",
  "armor",
  "shoes",
  "accessory1",
  "accessory2",
  "special",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export type EquipmentSlotState = Readonly<Record<EquipmentSlot, EquipmentInstance | null>>;

export interface EquipmentLoadout {
  readonly playerId: PlayerId;
  readonly slots: EquipmentSlotState;
}

export interface EquipmentChangeResult {
  readonly loadout: EquipmentLoadout;
  readonly previousEquipment: EquipmentInstance | null;
}

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

export function getEquippedEquipment(loadout: EquipmentLoadout): readonly EquipmentInstance[] {
  return getEquipmentEntries(loadout).flatMap(([, equipment]) =>
    equipment === null ? [] : [equipment],
  );
}

export function getEquipmentTypeForSlot(slot: EquipmentSlot): EquipmentType {
  if (slot === "accessory1" || slot === "accessory2") {
    return "accessory";
  }

  return slot;
}

function getEquipmentEntries(
  loadout: EquipmentLoadout,
): readonly (readonly [EquipmentSlot, EquipmentInstance | null])[] {
  return EQUIPMENT_SLOTS.map((slot) => [slot, loadout.slots[slot]] as const);
}
