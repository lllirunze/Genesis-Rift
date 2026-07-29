import { MAX_RANDOM_INTEGER_RANGE, type RandomStream } from "../core/random-stream.ts";
import type { WeightedItem } from "../model/weighted-item.ts";

export function pickWeightedItem<Item>(
  randomStream: RandomStream,
  weightedItems: readonly WeightedItem<Item>[],
): Item {
  if (weightedItems.length === 0) {
    throw new RangeError("cannot pick from an empty weighted item list");
  }

  let totalWeight = 0;
  let positiveWeightCount = 0;
  let onlyPositiveItem: Item | undefined;

  for (const weightedItem of weightedItems) {
    validateWeight(weightedItem.weight);

    if (weightedItem.weight > 0) {
      positiveWeightCount += 1;
      onlyPositiveItem = weightedItem.item;
    }

    totalWeight += weightedItem.weight;

    if (!Number.isSafeInteger(totalWeight) || totalWeight > MAX_RANDOM_INTEGER_RANGE) {
      throw new RangeError(`total weight must not exceed ${MAX_RANDOM_INTEGER_RANGE}`);
    }
  }

  if (totalWeight === 0) {
    throw new RangeError("at least one weighted item must have a positive weight");
  }

  if (positiveWeightCount === 1) {
    return onlyPositiveItem!;
  }

  const selectedWeight = randomStream.nextInt(0, totalWeight);
  let cumulativeWeight = 0;

  for (const weightedItem of weightedItems) {
    cumulativeWeight += weightedItem.weight;

    if (selectedWeight < cumulativeWeight) {
      return weightedItem.item;
    }
  }

  throw new Error("weighted random selection failed to resolve a candidate");
}

function validateWeight(weight: number): void {
  if (!Number.isSafeInteger(weight)) {
    throw new TypeError("random weights must be safe integers");
  }

  if (weight < 0) {
    throw new RangeError("random weights must not be negative");
  }
}
