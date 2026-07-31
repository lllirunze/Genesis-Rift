import { findFirstAvailableBackpackPosition, getItemDefinition } from "./backpack-geometry.ts";
import { placeItemInBackpack } from "./backpack-operations.ts";
import { fillCompatibleBackpackStacks } from "./backpack-stack-receipt.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { createItemInstance, type ItemInstance } from "./item-instance.ts";
import type { PlayerInventoryState } from "./player-inventory-state.ts";
import { storeNewTemporaryPickup } from "./temporary-pickup.ts";

export interface ReceiveItemInput {
  readonly definitionId: string;
  readonly quantity: number;
  readonly sourceId: string;
  readonly newItemInstanceIds: readonly string[];
  readonly stackCompatibilityKey?: string;
  readonly allowTemporaryStorage?: boolean;
}

export interface UnresolvedReceivedItem {
  readonly item: ItemInstance;
  readonly sourceId: string;
}

export interface ReceiveItemResult {
  readonly inventory: PlayerInventoryState;
  readonly backpackQuantityAdded: number;
  readonly temporaryQuantityAdded: number;
  readonly unresolvedItems: readonly UnresolvedReceivedItem[];
}

export function receiveItem(
  inventory: PlayerInventoryState,
  input: ReceiveItemInput,
  definitions: ItemDefinitionCatalog,
): ReceiveItemResult {
  assertPositiveSafeInteger(input.quantity, "quantity");
  assertNonEmptyString(input.sourceId, "sourceId");

  const definition = getItemDefinition(definitions, input.definitionId);
  const stackCompatibilityKey = input.stackCompatibilityKey ?? "default";
  assertNonEmptyString(stackCompatibilityKey, "stackCompatibilityKey");

  const incomingIdentity = {
    definitionId: definition.definitionId,
    ownerPlayerId: inventory.backpack.playerId,
    stackCompatibilityKey,
  };
  const availableExistingCapacity = inventory.backpack.entries.reduce(
    (capacity, entry) =>
      entry.item.definitionId === incomingIdentity.definitionId &&
      entry.item.ownerPlayerId === incomingIdentity.ownerPlayerId &&
      entry.item.stackCompatibilityKey === incomingIdentity.stackCompatibilityKey
        ? capacity + Math.max(0, definition.maximumStack - entry.item.quantity)
        : capacity,
    0,
  );
  const newQuantity = Math.max(0, input.quantity - availableExistingCapacity);
  const requiredInstanceCount = Math.ceil(newQuantity / definition.maximumStack);
  const instanceIds = input.newItemInstanceIds.slice(0, requiredInstanceCount);

  if (instanceIds.length < requiredInstanceCount) {
    throw new RangeError(
      `receiveItem requires ${requiredInstanceCount} new item instance ids, received ${instanceIds.length}`,
    );
  }

  validateNewInstanceIds(inventory, instanceIds);

  const newItems = createNormalizedItems(incomingIdentity, newQuantity, instanceIds, definition);
  const filled = fillCompatibleBackpackStacks(
    inventory.backpack,
    incomingIdentity,
    input.quantity,
    definition.maximumStack,
  );
  let currentInventory: PlayerInventoryState = {
    ...inventory,
    backpack: filled.backpack,
  };
  let backpackQuantityAdded = filled.addedQuantity;
  let temporaryQuantityAdded = 0;
  const unresolvedItems: UnresolvedReceivedItem[] = [];

  for (const item of newItems) {
    const position = findFirstAvailableBackpackPosition(
      currentInventory.backpack,
      definition,
      definitions,
    );

    if (position !== null) {
      currentInventory = {
        ...currentInventory,
        backpack: placeItemInBackpack(currentInventory.backpack, item, position, definitions),
      };
      backpackQuantityAdded += item.quantity;
      continue;
    }

    if ((input.allowTemporaryStorage ?? true) && currentInventory.temporaryPickup === null) {
      currentInventory = storeNewTemporaryPickup(
        currentInventory,
        item,
        input.sourceId,
        definitions,
      );
      temporaryQuantityAdded += item.quantity;
      continue;
    }

    unresolvedItems.push({ item, sourceId: input.sourceId });
  }

  return {
    inventory: currentInventory,
    backpackQuantityAdded,
    temporaryQuantityAdded,
    unresolvedItems,
  };
}

function createNormalizedItems(
  incoming: {
    readonly definitionId: string;
    readonly ownerPlayerId: ItemInstance["ownerPlayerId"];
    readonly stackCompatibilityKey: string;
  },
  quantity: number,
  instanceIds: readonly string[],
  definition: Parameters<typeof createItemInstance>[1],
): readonly ItemInstance[] {
  const items: ItemInstance[] = [];
  let remainingQuantity = quantity;

  for (const instanceId of instanceIds) {
    const itemQuantity = Math.min(remainingQuantity, definition.maximumStack);

    items.push(
      createItemInstance(
        {
          instanceId,
          definitionId: incoming.definitionId,
          ownerPlayerId: incoming.ownerPlayerId,
          quantity: itemQuantity,
          stackCompatibilityKey: incoming.stackCompatibilityKey,
        },
        definition,
      ),
    );
    remainingQuantity -= itemQuantity;
  }

  return items;
}

function validateNewInstanceIds(
  inventory: PlayerInventoryState,
  instanceIds: readonly string[],
): void {
  const existingIds = new Set(inventory.backpack.entries.map((entry) => entry.item.instanceId));

  if (inventory.temporaryPickup !== null) {
    existingIds.add(inventory.temporaryPickup.item.instanceId);
  }

  for (const instanceId of instanceIds) {
    assertNonEmptyString(instanceId, "newItemInstanceIds");

    if (existingIds.has(instanceId)) {
      throw new Error(`Duplicate inventory item instance: ${instanceId}`);
    }

    existingIds.add(instanceId);
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
