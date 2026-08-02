import type { BackpackState } from "./backpack-state.ts";
import type { ItemInstance } from "./item-instance.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface IncomingStackIdentity {
  readonly definitionId: string;
  readonly ownerPlayerId: ItemInstance["ownerPlayerId"];
  readonly stackCompatibilityKey: string;
}

/** 描述业务操作完成后返回的结果。 */
export interface FillCompatibleStacksResult {
  readonly backpack: BackpackState;
  readonly addedQuantity: number;
  readonly remainingQuantity: number;
}

/**
 * 方法名：fillCompatibleBackpackStacks
 * 作用：执行该方法负责的单一业务操作。
 * @param backpack 方法所需的 backpack 参数。
 * @param incoming 方法所需的 incoming 参数。
 * @param quantity 方法所需的 quantity 参数。
 * @param maximumStack 方法所需的 maximumStack 参数。
 * @returns 本次处理得到的结果。
 */
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
