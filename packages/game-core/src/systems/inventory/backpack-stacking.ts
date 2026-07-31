import { isBackpackPositionAvailable, getItemDefinition } from "./backpack-geometry.ts";
import { getBackpackEntry, type BackpackPosition, type BackpackState } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { areItemStacksCompatible, createItemInstance, type ItemInstance } from "./item-instance.ts";

export interface MergeItemStacksResult {
  readonly backpack: BackpackState;
  readonly transferredQuantity: number;
}

export function mergeBackpackItemStacks(
  backpack: BackpackState,
  sourceItemInstanceId: string,
  targetItemInstanceId: string,
  definitions: ItemDefinitionCatalog,
): MergeItemStacksResult {
  if (sourceItemInstanceId === targetItemInstanceId) {
    throw new Error("An item stack cannot be merged into itself");
  }

  const sourceEntry = getBackpackEntry(backpack, sourceItemInstanceId);
  const targetEntry = getBackpackEntry(backpack, targetItemInstanceId);

  if (!areItemStacksCompatible(sourceEntry.item, targetEntry.item)) {
    throw new Error("Item stacks are not compatible");
  }

  const definition = getItemDefinition(definitions, targetEntry.item.definitionId);
  const availableQuantity = definition.maximumStack - targetEntry.item.quantity;

  if (availableQuantity <= 0) {
    throw new RangeError(`Target item stack is already full: ${targetItemInstanceId}`);
  }

  const transferredQuantity = Math.min(availableQuantity, sourceEntry.item.quantity);
  const sourceQuantity = sourceEntry.item.quantity - transferredQuantity;

  return {
    backpack: {
      ...backpack,
      entries: backpack.entries.flatMap((entry) => {
        if (entry.item.instanceId === targetItemInstanceId) {
          return [
            {
              ...entry,
              item: {
                ...entry.item,
                quantity: entry.item.quantity + transferredQuantity,
              },
            },
          ];
        }

        if (entry.item.instanceId === sourceItemInstanceId) {
          return sourceQuantity === 0
            ? []
            : [{ ...entry, item: { ...entry.item, quantity: sourceQuantity } }];
        }

        return [entry];
      }),
    },
    transferredQuantity,
  };
}

export function splitBackpackItemStack(
  backpack: BackpackState,
  sourceItemInstanceId: string,
  splitQuantity: number,
  newItemInstanceId: string,
  targetPosition: BackpackPosition,
  definitions: ItemDefinitionCatalog,
): BackpackState {
  const sourceEntry = getBackpackEntry(backpack, sourceItemInstanceId);
  const definition = getItemDefinition(definitions, sourceEntry.item.definitionId);

  if (!Number.isSafeInteger(splitQuantity) || splitQuantity <= 0) {
    throw new TypeError("splitQuantity must be a positive safe integer");
  }

  if (splitQuantity >= sourceEntry.item.quantity) {
    throw new RangeError("splitQuantity must be less than the source stack quantity");
  }

  if (backpack.entries.some((entry) => entry.item.instanceId === newItemInstanceId)) {
    throw new Error(`Duplicate backpack item instance: ${newItemInstanceId}`);
  }

  if (!isBackpackPositionAvailable(backpack, definition, targetPosition, definitions)) {
    throw new Error(
      `Split item ${newItemInstanceId} cannot be placed at (${targetPosition.x}, ${targetPosition.y})`,
    );
  }

  const splitItem = createItemInstance(
    {
      instanceId: newItemInstanceId,
      definitionId: sourceEntry.item.definitionId,
      ownerPlayerId: sourceEntry.item.ownerPlayerId,
      quantity: splitQuantity,
      stackCompatibilityKey: sourceEntry.item.stackCompatibilityKey,
    },
    definition,
  );

  return {
    ...backpack,
    entries: [
      ...backpack.entries.map((entry) =>
        entry.item.instanceId === sourceItemInstanceId
          ? {
              ...entry,
              item: {
                ...entry.item,
                quantity: entry.item.quantity - splitQuantity,
              },
            }
          : entry,
      ),
      { item: splitItem, position: { ...targetPosition } },
    ],
  };
}

export function getBackpackItemQuantity(backpack: BackpackState, definitionId: string): number {
  return backpack.entries.reduce(
    (total, entry) =>
      entry.item.definitionId === definitionId ? total + entry.item.quantity : total,
    0,
  );
}

export function getCompatibleBackpackStacks(
  backpack: BackpackState,
  item: ItemInstance,
): readonly ItemInstance[] {
  return backpack.entries
    .map((entry) => entry.item)
    .filter((candidate) => areItemStacksCompatible(candidate, item));
}
