import { getCoinBalance, spendCoin, type CoinPaymentRecord } from "../economy/index.ts";
import type { PlayerInventoryState } from "../inventory/index.ts";

import { calculateDeathCoinLoss, type DeathCoinLossResult } from "./death-coin-loss.ts";
import { DEATH_COIN_LOSS_REASON_ID } from "./revival-config.ts";

/** 描述死亡元宝损失已实际写入背包后的完整结算结果。 */
export interface SettleDeathCoinLossResult {
  readonly inventory: PlayerInventoryState;
  readonly loss: DeathCoinLossResult;
  readonly payment: CoinPaymentRecord;
}

/**
 * 方法名：settleDeathCoinLoss
 * 作用：读取背包元宝、计算死亡损失并通过统一经济接口实际移除对应元宝物品。
 * @param inventory 角色正式死亡前的背包与临时拾取状态。
 * @returns 扣除后背包、损失计算结果与可审计的元宝支付记录。
 * @throws 背包元宝状态非法或统一元宝消费失败时抛出错误。
 */
export function settleDeathCoinLoss(inventory: PlayerInventoryState): SettleDeathCoinLossResult {
  const loss = calculateDeathCoinLoss(getCoinBalance(inventory));
  const paymentResult = spendCoin(inventory, {
    coinQuantity: loss.lostCoinQuantity,
    reasonId: DEATH_COIN_LOSS_REASON_ID,
  });

  return Object.freeze({
    inventory: paymentResult.inventory,
    loss,
    payment: paymentResult.payment,
  });
}
