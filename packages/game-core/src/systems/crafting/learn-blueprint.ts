import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import { consumeBackpackItemQuantity } from "../inventory/consume-backpack-item.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import type { BlueprintDefinition } from "./blueprint-definition.ts";
import {
  learnBlueprint,
  knowsBlueprint,
  type PlayerBlueprintState,
} from "./player-blueprint-state.ts";

/** 描述学习图纸的输入数据。 */
export interface LearnBlueprintInput {
  readonly sourceId: string;
}

/** 描述学习图纸后的结果。 */
export interface LearnBlueprintResult {
  readonly learned: boolean;
  readonly inventory: PlayerInventoryState;
  readonly blueprints: PlayerBlueprintState;
  readonly consumedItemInstanceIds: readonly string[];
}

/**
 * 方法名：learnBlueprintFromInventory
 * 作用：消耗背包中的图纸物品，并永久记录对应配方知识。
 * @param inventory 玩家背包状态。
 * @param blueprints 玩家图纸知识状态。
 * @param blueprint 图纸配方定义。
 * @param input 学习行为输入数据。
 * @param itemDefinitions 物品定义注册表。
 * @returns 图纸学习结果。
 * @throws 图纸物品不足或输入无效时抛出错误。
 */
export function learnBlueprintFromInventory(
  inventory: PlayerInventoryState,
  blueprints: PlayerBlueprintState,
  blueprint: BlueprintDefinition,
  input: LearnBlueprintInput,
  itemDefinitions: ItemDefinitionCatalog,
): LearnBlueprintResult {
  assertNonEmptyString(input.sourceId, "sourceId");

  if (knowsBlueprint(blueprints, blueprint.blueprintId)) {
    return Object.freeze({
      learned: false,
      inventory,
      blueprints,
      consumedItemInstanceIds: Object.freeze([]),
    });
  }

  if (itemDefinitions[blueprint.sourceItemDefinitionId] === undefined) {
    throw new Error(`Unknown blueprint source item: ${blueprint.sourceItemDefinitionId}`);
  }

  const consumption = consumeBackpackItemQuantity(
    inventory.backpack,
    blueprint.sourceItemDefinitionId,
    1,
  );

  return Object.freeze({
    learned: true,
    inventory: { ...inventory, backpack: consumption.backpack },
    blueprints: learnBlueprint(blueprints, blueprint.blueprintId),
    consumedItemInstanceIds: Object.freeze([...consumption.consumedItemInstanceIds]),
  });
}

/** 校验非空字符串。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
