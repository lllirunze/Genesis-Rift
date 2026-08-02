import { isBackpackLevel } from "./backpack-definition.ts";
import { getItemDefinition, isBackpackPositionAvailable } from "./backpack-geometry.ts";
import type { BackpackEntry, BackpackState } from "./backpack-state.ts";
import type { ItemDefinitionCatalog } from "./item-definition.ts";
import { validateItemInstance } from "./item-instance.ts";

/**
 * 方法名：validateBackpackState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param backpack 方法所需的 backpack 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateBackpackState(
  backpack: BackpackState,
  definitions: ItemDefinitionCatalog,
): void {
  if (!isBackpackLevel(backpack.level)) {
    throw new RangeError(`Unsupported backpack level: ${backpack.level as number}`);
  }

  const itemInstanceIds = new Set<string>();
  const validatedEntries: BackpackEntry[] = [];

  for (const entry of backpack.entries) {
    const { item } = entry;

    if (itemInstanceIds.has(item.instanceId)) {
      throw new Error(`Duplicate backpack item instance: ${item.instanceId}`);
    }

    if (item.ownerPlayerId !== backpack.playerId) {
      throw new Error(`Item ${item.instanceId} is owned by another player`);
    }

    const definition = getItemDefinition(definitions, item.definitionId);
    validateItemInstance(item, definition);

    const validatedBackpack: BackpackState = {
      ...backpack,
      entries: validatedEntries,
    };

    if (!isBackpackPositionAvailable(validatedBackpack, definition, entry.position, definitions)) {
      throw new Error(`Invalid position for backpack item: ${item.instanceId}`);
    }

    itemInstanceIds.add(item.instanceId);
    validatedEntries.push(entry);
  }
}
