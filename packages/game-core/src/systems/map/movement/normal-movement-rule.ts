import type { HexTile } from "../model/hex-tile.ts";

/** 描述天气、状态或区域规则对一次普通移动产生的通用修正。 */
export interface NormalMovementRuleAdjustment {
  readonly blocked: boolean;
  readonly additionalCost: number;
}

/** 描述外部系统解析普通移动规则时可以读取的相邻地块。 */
export interface NormalMovementRuleContext {
  readonly originTile: HexTile;
  readonly targetTile: HexTile;
}

/** 描述地图系统接受的外部普通移动规则解析入口。 */
export type NormalMovementRuleResolver = (
  context: NormalMovementRuleContext,
) => NormalMovementRuleAdjustment;

/** 无外部规则时使用的默认普通移动修正。 */
export const EMPTY_NORMAL_MOVEMENT_RULE_ADJUSTMENT: NormalMovementRuleAdjustment = Object.freeze({
  blocked: false,
  additionalCost: 0,
});

/**
 * 方法名：resolveNormalMovementRuleAdjustment
 * 作用：调用可选的外部规则解析器，并统一校验其通行状态与额外成本。
 * @param resolver 天气、区域或状态系统提供的规则解析器。
 * @param context 当前相邻地块组成的移动上下文。
 * @returns 冻结后的合法普通移动规则修正。
 * @throws 外部规则返回负数或非整数成本时抛出错误。
 */
export function resolveNormalMovementRuleAdjustment(
  resolver: NormalMovementRuleResolver | undefined,
  context: NormalMovementRuleContext,
): NormalMovementRuleAdjustment {
  if (resolver === undefined) {
    return EMPTY_NORMAL_MOVEMENT_RULE_ADJUSTMENT;
  }

  const adjustment = resolver(context);

  if (!Number.isSafeInteger(adjustment.additionalCost) || adjustment.additionalCost < 0) {
    throw new RangeError("Normal movement additional cost must be a non-negative safe integer");
  }

  return Object.freeze({
    blocked: adjustment.blocked,
    additionalCost: adjustment.additionalCost,
  });
}
