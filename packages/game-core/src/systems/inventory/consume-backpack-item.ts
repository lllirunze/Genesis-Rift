import type { BackpackState } from "./backpack-state.ts";

export interface ConsumeBackpackItemQuantityResult {
  readonly backpack: BackpackState;
  readonly remainingDefinitionQuantity: number;
  readonly consumedItemInstanceIds: readonly string[];
}

export function consumeBackpackItemQuantity(
  backpack: BackpackState,
  definitionId: string,
  quantity: number,
): ConsumeBackpackItemQuantityResult {
  assertNonEmptyString(definitionId, "definitionId");
  assertNonNegativeSafeInteger(quantity, "quantity");

  const matchingEntries = backpack.entries
    .filter((entry) => entry.item.definitionId === definitionId)
    .toSorted(
      (first, second) =>
        first.position.y - second.position.y ||
        first.position.x - second.position.x ||
        first.item.instanceId.localeCompare(second.item.instanceId),
    );
  const availableQuantity = matchingEntries.reduce((total, entry) => {
    const nextTotal = total + entry.item.quantity;

    if (!Number.isSafeInteger(nextTotal)) {
      throw new RangeError(`Item quantity exceeds the safe integer range: ${definitionId}`);
    }

    return nextTotal;
  }, 0);

  if (availableQuantity < quantity) {
    throw new RangeError(
      `Insufficient item quantity for ${definitionId}: required ${quantity}, available ${availableQuantity}`,
    );
  }

  const remainingQuantityByInstanceId = new Map<string, number>();
  const consumedItemInstanceIds: string[] = [];
  let remainingToConsume = quantity;

  for (const entry of matchingEntries) {
    if (remainingToConsume === 0) {
      break;
    }

    const consumedQuantity = Math.min(entry.item.quantity, remainingToConsume);

    remainingQuantityByInstanceId.set(
      entry.item.instanceId,
      entry.item.quantity - consumedQuantity,
    );
    consumedItemInstanceIds.push(entry.item.instanceId);
    remainingToConsume -= consumedQuantity;
  }

  return {
    backpack: {
      ...backpack,
      entries: backpack.entries.flatMap((entry) => {
        const remainingQuantity = remainingQuantityByInstanceId.get(entry.item.instanceId);

        if (remainingQuantity === undefined) {
          return [entry];
        }

        return remainingQuantity === 0
          ? []
          : [{ ...entry, item: { ...entry.item, quantity: remainingQuantity } }];
      }),
    },
    remainingDefinitionQuantity: availableQuantity - quantity,
    consumedItemInstanceIds,
  };
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
