import type { BackpackState } from "./backpack-state.ts";
import type { ItemInstance } from "./item-instance.ts";

export interface IncomingStackIdentity {
  readonly definitionId: string;
  readonly ownerPlayerId: ItemInstance["ownerPlayerId"];
  readonly stackCompatibilityKey: string;
}

export interface FillCompatibleStacksResult {
  readonly backpack: BackpackState;
  readonly addedQuantity: number;
  readonly remainingQuantity: number;
}

export function fillCompatibleBackpackStacks(
  backpack: BackpackState,
  incoming: IncomingStackIdentity,
  quantity: number,
  maximumStack: number,
): FillCompatibleStacksResult {
  const compatibleEntries = backpack.entries
    .filter(
      (entry) =>
        entry.item.definitionId === incoming.definitionId &&
        entry.item.ownerPlayerId === incoming.ownerPlayerId &&
        entry.item.stackCompatibilityKey === incoming.stackCompatibilityKey &&
        entry.item.quantity < maximumStack,
    )
    .toSorted(
      (first, second) =>
        first.position.y - second.position.y ||
        first.position.x - second.position.x ||
        first.item.instanceId.localeCompare(second.item.instanceId),
    );
  const quantityByInstanceId = new Map<string, number>();
  let remainingQuantity = quantity;

  for (const entry of compatibleEntries) {
    if (remainingQuantity === 0) {
      break;
    }

    const acceptedQuantity = Math.min(maximumStack - entry.item.quantity, remainingQuantity);

    quantityByInstanceId.set(entry.item.instanceId, entry.item.quantity + acceptedQuantity);
    remainingQuantity -= acceptedQuantity;
  }

  if (quantityByInstanceId.size === 0) {
    return {
      backpack,
      addedQuantity: 0,
      remainingQuantity,
    };
  }

  return {
    backpack: {
      ...backpack,
      entries: backpack.entries.map((entry) => {
        const updatedQuantity = quantityByInstanceId.get(entry.item.instanceId);

        return updatedQuantity === undefined
          ? entry
          : { ...entry, item: { ...entry.item, quantity: updatedQuantity } };
      }),
    },
    addedQuantity: quantity - remainingQuantity,
    remainingQuantity,
  };
}
