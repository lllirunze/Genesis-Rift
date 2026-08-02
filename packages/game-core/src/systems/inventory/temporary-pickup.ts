import {
  findFirstAvailableBackpackPosition,
  getItemDefinition,
  isBackpackPositionAvailable,
} from "./backpack-geometry.ts";
import { placeItemInBackpack } from "./backpack-operations.ts";
import { fillCompatibleBackpackStacks } from "./backpack-stack-receipt.ts";
import type { BackpackPosition } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS } from "./inventory-config.ts";
import type { PlayerInventoryState, TemporaryPickup } from "./player-inventory-state.ts";

export interface RemoveTemporaryPickupResult {
  readonly inventory: PlayerInventoryState;
  readonly removedPickup: TemporaryPickup;
}

export interface AdvanceTemporaryPickupResult {
  readonly inventory: PlayerInventoryState;
  readonly expiredPickup: TemporaryPickup | null;
}

export function storeTemporaryPickupInBackpack(
  inventory: PlayerInventoryState,
  definitions: ItemDefinitionCatalog,
  targetPosition?: BackpackPosition,
): PlayerInventoryState {
  const pickup = requireTemporaryPickup(inventory);
  const definition = getItemDefinition(definitions, pickup.item.definitionId);
  const filled = fillCompatibleBackpackStacks(
    inventory.backpack,
    pickup.item,
    pickup.item.quantity,
    definition.maximumStack,
  );

  if (filled.remainingQuantity === 0) {
    return {
      ...inventory,
      backpack: filled.backpack,
      temporaryPickup: null,
    };
  }

  const remainingItem = {
    ...pickup.item,
    quantity: filled.remainingQuantity,
  };
  const position =
    targetPosition ?? findFirstAvailableBackpackPosition(filled.backpack, definition, definitions);

  if (
    position === null ||
    !isBackpackPositionAvailable(filled.backpack, definition, position, definitions)
  ) {
    throw new Error(`Temporary item cannot be placed in the backpack: ${pickup.item.instanceId}`);
  }

  return {
    ...inventory,
    backpack: placeItemInBackpack(filled.backpack, remainingItem, position, definitions),
    temporaryPickup: null,
  };
}

export function abandonTemporaryPickup(
  inventory: PlayerInventoryState,
): RemoveTemporaryPickupResult {
  const removedPickup = requireTemporaryPickup(inventory);

  return {
    inventory: {
      ...inventory,
      temporaryPickup: null,
    },
    removedPickup,
  };
}

export function advanceTemporaryPickupOwnerTurn(
  inventory: PlayerInventoryState,
): AdvanceTemporaryPickupResult {
  const pickup = inventory.temporaryPickup;

  if (pickup === null) {
    return { inventory, expiredPickup: null };
  }

  assertRemainingOwnerTurns(pickup.remainingOwnerTurns);

  if (pickup.remainingOwnerTurns === 1) {
    return {
      inventory: {
        ...inventory,
        temporaryPickup: null,
      },
      expiredPickup: pickup,
    };
  }

  return {
    inventory: {
      ...inventory,
      temporaryPickup: {
        ...pickup,
        remainingOwnerTurns: pickup.remainingOwnerTurns - 1,
      },
    },
    expiredPickup: null,
  };
}

function requireTemporaryPickup(inventory: PlayerInventoryState): TemporaryPickup {
  if (inventory.temporaryPickup === null) {
    throw new Error("Temporary pickup is empty");
  }

  return inventory.temporaryPickup;
}

function assertRemainingOwnerTurns(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS
  ) {
    throw new RangeError(
      `remainingOwnerTurns must be between 1 and ${TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS}`,
    );
  }
}
