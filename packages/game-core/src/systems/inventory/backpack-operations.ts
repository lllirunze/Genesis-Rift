import { getBackpackUsableArea } from "./backpack-definition.ts";
import { getItemDefinition, isBackpackPositionAvailable } from "./backpack-geometry.ts";
import { getBackpackEntry, type BackpackPosition, type BackpackState } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import type { ItemInstance } from "./item-instance.ts";
import { validateItemInstance } from "./item-instance.ts";

/** 描述业务操作完成后返回的结果。 */
export interface RemoveBackpackItemResult {
  readonly backpack: BackpackState;
  readonly item: ItemInstance;
}

/**
 * 方法名：placeItemInBackpack
 * 作用：按位置与空间约束移动目标对象。
 * @param backpack 方法所需的 backpack 参数。
 * @param item 方法所需的 item 参数。
 * @param position 方法所需的 position 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function placeItemInBackpack(
  backpack: BackpackState,
  item: ItemInstance,
  position: BackpackPosition,
  definitions: ItemDefinitionCatalog,
): BackpackState {
  if (item.ownerPlayerId !== backpack.playerId) {
    throw new Error(`Item ${item.instanceId} is owned by another player`);
  }

  if (backpack.entries.some((entry) => entry.item.instanceId === item.instanceId)) {
    throw new Error(`Duplicate backpack item instance: ${item.instanceId}`);
  }

  const definition = getItemDefinition(definitions, item.definitionId);
  validateItemInstance(item, definition);

  if (!isBackpackPositionAvailable(backpack, definition, position, definitions)) {
    throw new Error(`Item ${item.instanceId} cannot be placed at (${position.x}, ${position.y})`);
  }

  return {
    ...backpack,
    entries: [...backpack.entries, { item, position: { ...position } }],
  };
}

/**
 * 方法名：moveBackpackItem
 * 作用：按位置与空间约束移动目标对象。
 * @param backpack 方法所需的 backpack 参数。
 * @param itemInstanceId 方法所需的 itemInstanceId 参数。
 * @param targetPosition 方法所需的 targetPosition 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function moveBackpackItem(
  backpack: BackpackState,
  itemInstanceId: string,
  targetPosition: BackpackPosition,
  definitions: ItemDefinitionCatalog,
): BackpackState {
  const entry = getBackpackEntry(backpack, itemInstanceId);
  const definition = getItemDefinition(definitions, entry.item.definitionId);

  if (
    !isBackpackPositionAvailable(backpack, definition, targetPosition, definitions, itemInstanceId)
  ) {
    throw new Error(
      `Item ${itemInstanceId} cannot be moved to (${targetPosition.x}, ${targetPosition.y})`,
    );
  }

  return {
    ...backpack,
    entries: backpack.entries.map((candidate) =>
      candidate.item.instanceId === itemInstanceId
        ? { ...candidate, position: { ...targetPosition } }
        : candidate,
    ),
  };
}

/**
 * 方法名：removeBackpackItem
 * 作用：移除目标数据，并返回更新后的状态。
 * @param backpack 方法所需的 backpack 参数。
 * @param itemInstanceId 方法所需的 itemInstanceId 参数。
 * @returns 本次处理得到的结果。
 */
export function removeBackpackItem(
  backpack: BackpackState,
  itemInstanceId: string,
): RemoveBackpackItemResult {
  const entry = getBackpackEntry(backpack, itemInstanceId);

  return {
    backpack: {
      ...backpack,
      entries: backpack.entries.filter((candidate) => candidate.item.instanceId !== itemInstanceId),
    },
    item: entry.item,
  };
}

/**
 * 方法名：upgradeBackpack
 * 作用：执行该方法负责的单一业务操作。
 * @param backpack 方法所需的 backpack 参数。
 * @returns 本次处理得到的结果。
 */
export function upgradeBackpack(backpack: BackpackState): BackpackState {
  if (backpack.level === 3) {
    throw new RangeError("Backpack is already at the maximum level");
  }

  const level = backpack.level === 1 ? 2 : 3;

  // 背包始终从左上角向右或向下扩展，因此已有物品坐标在升级后仍然有效。
  return {
    ...backpack,
    level,
  };
}

/**
 * 方法名：getBackpackUnlockedCellCount
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param backpack 方法所需的 backpack 参数。
 * @returns 本次处理得到的结果。
 */
export function getBackpackUnlockedCellCount(backpack: BackpackState): number {
  const area = getBackpackUsableArea(backpack.level);
  return area.width * area.height;
}
