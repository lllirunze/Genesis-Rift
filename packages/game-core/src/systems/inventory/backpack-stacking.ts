import { isBackpackPositionAvailable, getItemDefinition } from "./backpack-geometry.ts";
import { getBackpackEntry, type BackpackPosition, type BackpackState } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { areItemStacksCompatible, createItemInstance, type ItemInstance } from "./item-instance.ts";

/** 描述业务操作完成后返回的结果。 */
export interface MergeItemStacksResult {
  readonly backpack: BackpackState;
  readonly transferredQuantity: number;
}

/**
 * 方法名：mergeBackpackItemStacks
 * 作用：执行该方法负责的单一业务操作。
 * @param backpack 方法所需的 backpack 参数。
 * @param sourceItemInstanceId 方法所需的 sourceItemInstanceId 参数。
 * @param targetItemInstanceId 方法所需的 targetItemInstanceId 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：splitBackpackItemStack
 * 作用：执行该方法负责的单一业务操作。
 * @param backpack 方法所需的 backpack 参数。
 * @param sourceItemInstanceId 方法所需的 sourceItemInstanceId 参数。
 * @param splitQuantity 方法所需的 splitQuantity 参数。
 * @param newItemInstanceId 方法所需的 newItemInstanceId 参数。
 * @param targetPosition 方法所需的 targetPosition 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：getBackpackItemQuantity
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param backpack 方法所需的 backpack 参数。
 * @param definitionId 目标配置定义标识。
 * @returns 本次处理得到的结果。
 */
export function getBackpackItemQuantity(backpack: BackpackState, definitionId: string): number {
  return backpack.entries.reduce(
    (total, entry) =>
      entry.item.definitionId === definitionId ? total + entry.item.quantity : total,
    0,
  );
}

/**
 * 方法名：getCompatibleBackpackStacks
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param backpack 方法所需的 backpack 参数。
 * @param item 方法所需的 item 参数。
 * @returns 本次处理得到的结果。
 */
export function getCompatibleBackpackStacks(
  backpack: BackpackState,
  item: ItemInstance,
): readonly ItemInstance[] {
  return backpack.entries
    .map((entry) => entry.item)
    .filter((candidate) => areItemStacksCompatible(candidate, item));
}
