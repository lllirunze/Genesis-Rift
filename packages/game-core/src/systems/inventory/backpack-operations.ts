import { getBackpackUsableArea } from "./backpack-definition.ts";
import { getItemDefinition, isBackpackPositionAvailable } from "./backpack-geometry.ts";
import { getBackpackEntry, type BackpackPosition, type BackpackState } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import type { ItemInstance } from "./item-instance.ts";
import { validateItemInstance } from "./item-instance.ts";

export interface RemoveBackpackItemResult {
  readonly backpack: BackpackState;
  readonly item: ItemInstance;
}

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

export function upgradeBackpack(backpack: BackpackState): BackpackState {
  if (backpack.level === 3) {
    throw new RangeError("Backpack is already at the maximum level");
  }

  const level = backpack.level === 1 ? 2 : 3;

  // Existing coordinates remain valid because every level expands from the top-left corner.
  return {
    ...backpack,
    level,
  };
}

export function getBackpackUnlockedCellCount(backpack: BackpackState): number {
  const area = getBackpackUsableArea(backpack.level);
  return area.width * area.height;
}
