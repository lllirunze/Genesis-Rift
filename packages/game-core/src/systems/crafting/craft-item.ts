import type { ItemDefinitionCatalog } from "@genesis-rift/shared";

import {
  canAffordCoin,
  getCoinBalance,
  spendCoin,
  type CoinPaymentRecord,
} from "../economy/coin.ts";
import { consumeBackpackItemQuantity } from "../inventory/consume-backpack-item.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { receiveItem } from "../inventory/receive-item.ts";
import type { BlueprintDefinition } from "./blueprint-definition.ts";
import { CRAFTING_PRODUCT_QUANTITY } from "./crafting-config.ts";
import { knowsBlueprint, type PlayerBlueprintState } from "./player-blueprint-state.ts";

/** 描述一次制造请求。 */
export interface CraftItemInput {
  readonly transactionId: string;
  readonly productItemInstanceIds: readonly string[];
  readonly satisfiedConditionIds: readonly string[];
}

/** 描述制造失败的统一结果。 */
export interface CraftItemFailureResult {
  readonly crafted: false;
  readonly inventory: PlayerInventoryState;
  readonly reason:
    | "unknown-blueprint"
    | "unmet-condition"
    | "insufficient-material"
    | "insufficient-coin"
    | "insufficient-backpack-space";
  readonly missingIds: readonly string[];
}

/** 描述制造成功后的完整结算结果。 */
export interface CraftItemSuccessResult {
  readonly crafted: true;
  readonly inventory: PlayerInventoryState;
  readonly craftedItemDefinitionId: string;
  readonly craftedItemInstanceIds: readonly string[];
  readonly consumedMaterialItemInstanceIds: readonly string[];
  readonly payment: CoinPaymentRecord;
}

/** 描述制造服务的返回结果。 */
export type CraftItemResult = CraftItemFailureResult | CraftItemSuccessResult;

/**
 * 方法名：craftItem
 * 作用：在材料、元宝、条件和正式背包空间均满足时原子制造一件成品。
 * @param inventory 玩家背包状态。
 * @param blueprints 玩家图纸知识状态。
 * @param blueprint 待执行的图纸配方。
 * @param input 本次制造请求。
 * @param itemDefinitions 物品定义注册表。
 * @returns 制造成功后的新背包，或保持原状态的失败结果。
 */
export function craftItem(
  inventory: PlayerInventoryState,
  blueprints: PlayerBlueprintState,
  blueprint: BlueprintDefinition,
  input: CraftItemInput,
  itemDefinitions: ItemDefinitionCatalog,
): CraftItemResult {
  validateCraftItemInput(input);

  if (!knowsBlueprint(blueprints, blueprint.blueprintId)) {
    return failure(inventory, "unknown-blueprint", [blueprint.blueprintId]);
  }

  const satisfiedConditionIds = new Set(input.satisfiedConditionIds);
  const unmetConditionIds = blueprint.requiredConditionIds.filter(
    (conditionId) => !satisfiedConditionIds.has(conditionId),
  );

  if (unmetConditionIds.length > 0) {
    return failure(inventory, "unmet-condition", unmetConditionIds);
  }

  let inventoryAfterMaterials = inventory;
  const consumedMaterialItemInstanceIds: string[] = [];

  try {
    for (const requirement of blueprint.materialRequirements) {
      const consumption = consumeBackpackItemQuantity(
        inventoryAfterMaterials.backpack,
        requirement.itemDefinitionId,
        requirement.quantity,
      );
      inventoryAfterMaterials = { ...inventoryAfterMaterials, backpack: consumption.backpack };
      consumedMaterialItemInstanceIds.push(...consumption.consumedItemInstanceIds);
    }
  } catch (error) {
    if (error instanceof RangeError) {
      const missingMaterialIds = findMissingMaterialIds(inventory, blueprint);
      return failure(inventory, "insufficient-material", missingMaterialIds);
    }

    throw error;
  }

  if (!canAffordCoin(inventoryAfterMaterials, blueprint.coinCost)) {
    return failure(inventory, "insufficient-coin", [
      String(blueprint.coinCost - getCoinBalance(inventoryAfterMaterials)),
    ]);
  }

  const paymentResult = spendCoin(inventoryAfterMaterials, {
    coinQuantity: blueprint.coinCost,
    reasonId: input.transactionId,
  });
  const receipt = receiveItem(
    paymentResult.inventory,
    {
      definitionId: blueprint.productItemDefinitionId,
      quantity: CRAFTING_PRODUCT_QUANTITY,
      sourceId: input.transactionId,
      newItemInstanceIds: input.productItemInstanceIds,
      allowTemporaryStorage: false,
    },
    itemDefinitions,
  );

  if (
    receipt.backpackQuantityAdded !== CRAFTING_PRODUCT_QUANTITY ||
    receipt.temporaryQuantityAdded !== 0 ||
    receipt.unresolvedItems.length > 0
  ) {
    return failure(inventory, "insufficient-backpack-space", [blueprint.productItemDefinitionId]);
  }

  const craftedItemInstanceIds = collectNewProductInstanceIds(
    paymentResult.inventory,
    receipt.inventory,
    blueprint.productItemDefinitionId,
  );

  return Object.freeze({
    crafted: true,
    inventory: receipt.inventory,
    craftedItemDefinitionId: blueprint.productItemDefinitionId,
    craftedItemInstanceIds: Object.freeze(craftedItemInstanceIds),
    consumedMaterialItemInstanceIds: Object.freeze(consumedMaterialItemInstanceIds),
    payment: paymentResult.payment,
  });
}

/** 创建保持原背包状态的制造失败结果。 */
function failure(
  inventory: PlayerInventoryState,
  reason: CraftItemFailureResult["reason"],
  missingIds: readonly string[],
): CraftItemFailureResult {
  return Object.freeze({
    crafted: false,
    inventory,
    reason,
    missingIds: Object.freeze([...missingIds]),
  });
}

/** 计算未满足数量的材料资源 ID。 */
function findMissingMaterialIds(
  inventory: PlayerInventoryState,
  blueprint: BlueprintDefinition,
): readonly string[] {
  return blueprint.materialRequirements.flatMap((requirement) => {
    const availableQuantity = inventory.backpack.entries
      .filter((entry) => entry.item.definitionId === requirement.itemDefinitionId)
      .reduce((total, entry) => total + entry.item.quantity, 0);

    return availableQuantity < requirement.quantity ? [requirement.itemDefinitionId] : [];
  });
}

/** 收集本次制造新创建并进入背包的成品实例 ID。 */
function collectNewProductInstanceIds(
  previousInventory: PlayerInventoryState,
  currentInventory: PlayerInventoryState,
  productItemDefinitionId: string,
): string[] {
  const existingInstanceIds = new Set(
    previousInventory.backpack.entries.map((entry) => entry.item.instanceId),
  );

  return currentInventory.backpack.entries.flatMap((entry) =>
    entry.item.definitionId === productItemDefinitionId &&
    !existingInstanceIds.has(entry.item.instanceId)
      ? [entry.item.instanceId]
      : [],
  );
}

/** 校验制造请求。 */
function validateCraftItemInput(input: CraftItemInput): void {
  if (typeof input.transactionId !== "string" || input.transactionId.trim().length === 0) {
    throw new TypeError("transactionId must be a non-empty string");
  }

  if (input.productItemInstanceIds.length === 0) {
    throw new RangeError("productItemInstanceIds must contain at least one id");
  }

  for (const itemInstanceId of input.productItemInstanceIds) {
    if (itemInstanceId.trim().length === 0) {
      throw new TypeError("productItemInstanceIds must not contain empty ids");
    }
  }
}
