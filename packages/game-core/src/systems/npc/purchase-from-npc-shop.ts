import type { ItemDefinitionCatalog, TileId } from "@genesis-rift/shared";

import {
  purchaseItemWithCoin,
  type PurchaseItemWithCoinResult,
} from "../economy/purchase-item-with-coin.ts";
import type { PlayerInventoryState } from "../inventory/player-inventory-state.ts";
import { getNpcServiceDefinition, type NpcDefinition } from "./npc-definition.ts";
import {
  evaluateNpcInteractionEligibility,
  type NpcInteractionEligibilityResult,
} from "./npc-interaction.ts";
import type { NpcRuntimeState } from "./npc-runtime-state.ts";
import { getShopItemDefinition, type ShopDefinitionCatalog } from "./shop-definition.ts";

/** 描述玩家向 NPC 商店购买一项商品时需要提供的输入。 */
export interface PurchaseFromNpcShopInput {
  readonly playerTileId: TileId;
  readonly npcDefinition: NpcDefinition;
  readonly npcState: NpcRuntimeState;
  readonly shopDefinitions: ShopDefinitionCatalog;
  readonly inventory: PlayerInventoryState;
  readonly transactionId: string;
  readonly itemDefinitionId: string;
  readonly itemQuantity: number;
  readonly newItemInstanceIds: readonly string[];
  readonly itemDefinitions: ItemDefinitionCatalog;
}

/** 描述 NPC 商店交互或商品上架条件不满足时保持原背包的结果。 */
export interface PurchaseFromNpcShopFailureResult {
  readonly purchased: false;
  readonly interaction: NpcInteractionEligibilityResult;
  readonly inventory: PlayerInventoryState;
  readonly reason: "npc-interaction-unavailable" | "item-unavailable";
}

/** 描述已进入 NPC 商店并完成经济系统购买结算的结果。 */
export interface PurchaseFromNpcShopSuccessResult {
  readonly purchased: true;
  readonly interaction: NpcInteractionEligibilityResult & { readonly allowed: true };
  readonly purchase: PurchaseItemWithCoinResult;
}

/** 描述 NPC 商店购买的完整结果。 */
export type PurchaseFromNpcShopResult =
  PurchaseFromNpcShopFailureResult | PurchaseFromNpcShopSuccessResult;

/**
 * 方法名：purchaseFromNpcShop
 * 作用：校验同地块 NPC 商店服务和商品上架后，复用经济系统执行批量物品购买。
 * @param input 玩家位置、NPC、商店、背包与购买请求输入。
 * @returns 商店不可用时保持原背包的失败结果，或已经进入购买结算的结果。
 * @throws NPC 商店服务引用缺失、商店定义不存在或购买数量非法时抛出错误。
 */
export function purchaseFromNpcShop(input: PurchaseFromNpcShopInput): PurchaseFromNpcShopResult {
  const interaction = evaluateNpcInteractionEligibility(input.npcDefinition, input.npcState, {
    playerTileId: input.playerTileId,
    serviceType: "shop",
  });

  if (!interaction.allowed) {
    return Object.freeze({
      purchased: false,
      interaction,
      inventory: input.inventory,
      reason: "npc-interaction-unavailable",
    });
  }

  const service = getNpcServiceDefinition(input.npcDefinition, "shop");

  if (service?.shopDefinitionId === undefined) {
    throw new Error("Allowed NPC shop interaction must provide shopDefinitionId");
  }

  const shop = input.shopDefinitions[service.shopDefinitionId];

  if (shop === undefined) {
    throw new Error(`NPC shop definition not found: ${service.shopDefinitionId}`);
  }

  const item = getShopItemDefinition(shop, input.itemDefinitionId);

  if (item === null) {
    return Object.freeze({
      purchased: false,
      interaction,
      inventory: input.inventory,
      reason: "item-unavailable",
    });
  }

  return Object.freeze({
    purchased: true,
    interaction,
    purchase: purchaseItemWithCoin(
      input.inventory,
      {
        transactionId: input.transactionId,
        itemDefinitionId: item.itemDefinitionId,
        itemQuantity: input.itemQuantity,
        totalCoinPrice: multiplySafeIntegers(item.unitCoinPrice, input.itemQuantity),
        newItemInstanceIds: input.newItemInstanceIds,
      },
      input.itemDefinitions,
    ),
  });
}

/** 计算批量购买总价，并拒绝超过安全整数范围的输入。 */
function multiplySafeIntegers(unitPrice: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) {
    throw new RangeError("unitCoinPrice must be a non-negative safe integer");
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError("itemQuantity must be a positive safe integer");
  }

  const total = unitPrice * quantity;

  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Shop total coin price exceeds the safe integer range");
  }

  return total;
}
