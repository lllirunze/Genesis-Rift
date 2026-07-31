import {
  BACKPACK_GRID_HEIGHT,
  BACKPACK_GRID_WIDTH,
  getBackpackUsableArea,
} from "./backpack-config.ts";
import type { BackpackPosition, BackpackState } from "./backpack-state.ts";
import type { ItemDefinition, ItemDefinitionCatalog } from "./item-definition.ts";

export type BackpackCell =
  | { readonly kind: "locked" }
  | { readonly kind: "empty" }
  | { readonly kind: "occupied"; readonly itemInstanceId: string };

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

function isValidPosition(position: BackpackPosition): boolean {
  return (
    Number.isSafeInteger(position.x) &&
    Number.isSafeInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0
  );
}

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
