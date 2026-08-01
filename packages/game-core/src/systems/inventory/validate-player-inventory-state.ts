import { getItemDefinition } from "./backpack-geometry.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { validateItemInstance } from "./item-instance.ts";
import { TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS } from "./inventory-config.ts";
import type { PlayerInventoryState } from "./player-inventory-state.ts";
import { validateBackpackState } from "./validate-backpack-state.ts";

export function validatePlayerInventoryState(
  inventory: PlayerInventoryState,
  definitions: ItemDefinitionCatalog,
): void {
  validateBackpackState(inventory.backpack, definitions);

  const pickup = inventory.temporaryPickup;

  if (pickup === null) {
    return;
  }

  if (pickup.sourceId.trim().length === 0) {
    throw new TypeError("temporaryPickup.sourceId must not be empty");
  }

  if (
    !Number.isSafeInteger(pickup.remainingOwnerTurns) ||
    pickup.remainingOwnerTurns <= 0 ||
    pickup.remainingOwnerTurns > TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS
  ) {
    throw new RangeError(
      `temporaryPickup.remainingOwnerTurns must be between 1 and ${TEMPORARY_PICKUP_INITIAL_REMAINING_TURNS}`,
    );
  }

  if (pickup.item.ownerPlayerId !== inventory.backpack.playerId) {
    throw new Error(`Temporary item ${pickup.item.instanceId} is owned by another player`);
  }

  if (
    inventory.backpack.entries.some((entry) => entry.item.instanceId === pickup.item.instanceId)
  ) {
    throw new Error(`Duplicate inventory item instance: ${pickup.item.instanceId}`);
  }

  const definition = getItemDefinition(definitions, pickup.item.definitionId);
  validateItemInstance(pickup.item, definition);
}
