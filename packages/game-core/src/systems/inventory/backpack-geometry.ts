import { BACKPACK_GRID_HEIGHT, BACKPACK_GRID_WIDTH } from "./backpack-config.ts";
import { getBackpackUsableArea } from "./backpack-definition.ts";
import type { BackpackPosition, BackpackState } from "./backpack-state.ts";
import type { ItemDefinition, ItemDefinitionCatalog } from "./item-definition.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type BackpackCell =
  | { readonly kind: "locked" }
  | { readonly kind: "empty" }
  | { readonly kind: "occupied"; readonly itemInstanceId: string };

/**
 * 方法名：isBackpackPositionAvailable
 * 作用：判断输入是否满足当前业务条件。
 * @param backpack 方法所需的 backpack 参数。
 * @param definition 方法所需的 definition 参数。
 * @param position 方法所需的 position 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @param ignoredItemInstanceId 方法所需的 ignoredItemInstanceId 参数。
 * @returns 本次处理得到的结果。
 */
export function isBackpackPositionAvailable(
  backpack: BackpackState,
  definition: ItemDefinition,
  position: BackpackPosition,
  definitions: ItemDefinitionCatalog,
  ignoredItemInstanceId?: string,
): boolean {
  if (!isValidPosition(position)) {
    return false;
  }

  const usableArea = getBackpackUsableArea(backpack.level);

  if (
    position.x + definition.width > usableArea.width ||
    position.y + definition.height > usableArea.height
  ) {
    return false;
  }

  const requestedCells = getOccupiedCellKeys(position, definition);

  for (const entry of backpack.entries) {
    if (entry.item.instanceId === ignoredItemInstanceId) {
      continue;
    }

    const existingDefinition = getItemDefinition(definitions, entry.item.definitionId);

    for (const cell of getOccupiedCellKeys(entry.position, existingDefinition)) {
      if (requestedCells.has(cell)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 方法名：findFirstAvailableBackpackPosition
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param backpack 方法所需的 backpack 参数。
 * @param definition 方法所需的 definition 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function findFirstAvailableBackpackPosition(
  backpack: BackpackState,
  definition: ItemDefinition,
  definitions: ItemDefinitionCatalog,
): BackpackPosition | null {
  const usableArea = getBackpackUsableArea(backpack.level);

  for (let y = 0; y <= usableArea.height - definition.height; y += 1) {
    for (let x = 0; x <= usableArea.width - definition.width; x += 1) {
      const position = { x, y };

      if (isBackpackPositionAvailable(backpack, definition, position, definitions)) {
        return position;
      }
    }
  }

  return null;
}

/**
 * 方法名：createBackpackGrid
 * 作用：创建并校验该方法所负责的业务对象。
 * @param backpack 方法所需的 backpack 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function createBackpackGrid(
  backpack: BackpackState,
  definitions: ItemDefinitionCatalog,
): readonly (readonly BackpackCell[])[] {
  const usableArea = getBackpackUsableArea(backpack.level);
  const grid: BackpackCell[][] = Array.from({ length: BACKPACK_GRID_HEIGHT }, (_, y) =>
    Array.from({ length: BACKPACK_GRID_WIDTH }, (_, x) =>
      x < usableArea.width && y < usableArea.height
        ? ({ kind: "empty" } as const)
        : ({ kind: "locked" } as const),
    ),
  );

  for (const entry of backpack.entries) {
    const definition = getItemDefinition(definitions, entry.item.definitionId);

    for (let y = entry.position.y; y < entry.position.y + definition.height; y += 1) {
      for (let x = entry.position.x; x < entry.position.x + definition.width; x += 1) {
        grid[y]![x] = {
          kind: "occupied",
          itemInstanceId: entry.item.instanceId,
        };
      }
    }
  }

  return grid;
}

/**
 * 方法名：getItemDefinition
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param definitions 方法所需的 definitions 参数。
 * @param definitionId 目标配置定义标识。
 * @returns 本次处理得到的结果。
 */
export function getItemDefinition(
  definitions: ItemDefinitionCatalog,
  definitionId: string,
): ItemDefinition {
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Missing item definition: ${definitionId}`);
  }

  return definition;
}

/**
 * 方法名：isValidPosition
 * 作用：判断输入是否满足当前业务条件。
 * @param position 方法所需的 position 参数。
 * @returns 本次处理得到的结果。
 */
function isValidPosition(position: BackpackPosition): boolean {
  return (
    Number.isSafeInteger(position.x) &&
    Number.isSafeInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0
  );
}

/**
 * 方法名：getOccupiedCellKeys
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param position 方法所需的 position 参数。
 * @param definition 方法所需的 definition 参数。
 * @returns 本次处理得到的结果。
 */
function getOccupiedCellKeys(
  position: BackpackPosition,
  definition: ItemDefinition,
): ReadonlySet<string> {
  const cells = new Set<string>();

  for (let y = position.y; y < position.y + definition.height; y += 1) {
    for (let x = position.x; x < position.x + definition.width; x += 1) {
      cells.add(`${x}:${y}`);
    }
  }

  return cells;
}
