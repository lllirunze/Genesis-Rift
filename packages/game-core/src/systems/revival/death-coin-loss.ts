import { DEATH_COIN_LOSS_DENOMINATOR, DEATH_COIN_LOSS_NUMERATOR } from "./revival-config.ts";

/** 描述死亡元宝损失的纯计算结果。 */
export interface DeathCoinLossResult {
  readonly previousCoinQuantity: number;
  readonly lostCoinQuantity: number;
  readonly remainingCoinQuantity: number;
}

/**
 * 方法名：calculateDeathCoinLoss
 * 作用：按照当前元宝数量的百分之二十向下取整，计算角色正式死亡时的元宝损失。
 * @param currentCoinQuantity 角色背包中可用于经济结算的当前元宝数量。
 * @returns 包含死亡前数量、损失数量与剩余数量的不可变计算结果。
 * @throws 元宝数量不是非负安全整数时抛出错误。
 */
export function calculateDeathCoinLoss(currentCoinQuantity: number): DeathCoinLossResult {
  assertNonNegativeSafeInteger(currentCoinQuantity, "currentCoinQuantity");
  const lostCoinQuantity = Math.floor(
    (currentCoinQuantity * DEATH_COIN_LOSS_NUMERATOR) / DEATH_COIN_LOSS_DENOMINATOR,
  );

  return Object.freeze({
    previousCoinQuantity: currentCoinQuantity,
    lostCoinQuantity,
    remainingCoinQuantity: currentCoinQuantity - lostCoinQuantity,
  });
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}
