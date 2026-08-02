import type { RandomStream } from "../core/random-stream.ts";

/**
 * 方法名：pickRandomItem
 * 作用：执行该方法负责的单一业务操作。
 * @param randomStream 方法所需的 randomStream 参数。
 * @param items 方法所需的 items 参数。
 * @returns 本次处理得到的结果。
 */
export function pickRandomItem<Item>(randomStream: RandomStream, items: readonly Item[]): Item {
  if (items.length === 0) {
    throw new RangeError("cannot pick from an empty item list");
  }

  if (items.length === 1) {
    return items[0]!;
  }

  return items[randomStream.nextInt(0, items.length)]!;
}

/**
 * 方法名：pickRandomItems
 * 作用：执行该方法负责的单一业务操作。
 * @param randomStream 方法所需的 randomStream 参数。
 * @param items 方法所需的 items 参数。
 * @param count 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function pickRandomItems<Item>(
  randomStream: RandomStream,
  items: readonly Item[],
  count: number,
): Item[] {
  if (!Number.isSafeInteger(count)) {
    throw new TypeError("random item count must be a safe integer");
  }

  if (count < 0 || count > items.length) {
    throw new RangeError("random item count must be between 0 and the item list length");
  }

  const candidates = [...items];

  for (let index = 0; index < count; index += 1) {
    if (index < candidates.length - 1) {
      const selectedIndex = randomStream.nextInt(index, candidates.length);
      const selectedItem = candidates[selectedIndex]!;

      candidates[selectedIndex] = candidates[index]!;
      candidates[index] = selectedItem;
    }
  }

  return candidates.slice(0, count);
}
