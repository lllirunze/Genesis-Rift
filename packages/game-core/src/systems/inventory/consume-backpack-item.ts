import type { BackpackState } from "./backpack-state.ts";

/** 描述业务操作完成后返回的结果。 */
export interface ConsumeBackpackItemQuantityResult {
  readonly backpack: BackpackState;
  readonly remainingDefinitionQuantity: number;
  readonly consumedItemInstanceIds: readonly string[];
}

/**
 * 方法名：consumeBackpackItemQuantity
 * 作用：执行该方法负责的单一业务操作。
 * @param backpack 方法所需的 backpack 参数。
 * @param definitionId 目标配置定义标识。
 * @param quantity 方法所需的 quantity 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
