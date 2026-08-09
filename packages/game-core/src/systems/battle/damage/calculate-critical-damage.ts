import { CRITICAL_DAMAGE_PERCENT_SCALE, MINIMUM_CRITICAL_DAMAGE_PERCENT } from "./damage-config.ts";
import {
  assertNonNegativeSafeInteger,
  assertSafeIntegerResult,
  validateCriticalDamageCalculationInput,
  type CriticalDamageCalculationInput,
} from "./damage-definition.ts";

/** 描述暴击放大阶段产生的规范化百分数与最终伤害。 */
export interface CriticalDamageResult {
  readonly criticalEnabled: boolean;
  readonly criticalTriggered: boolean;
  readonly criticalDamagePercent: number;
  readonly damage: number;
}

/**
 * 方法名：calculateCriticalDamage
 * 作用：根据外部已经确定的暴击结果，使用整数百分数放大基础伤害并向下取整。
 * @param baseDamage 防御结算后得到的非负基础伤害。
 * @param critical 暴击权限、触发结果和整数伤害百分数。
 * @returns 暴击边界与伤害放大后的不可变结果。
 * @throws 基础伤害或暴击输入非法、乘法结果超出安全整数范围时抛出错误。
 */
export function calculateCriticalDamage(
  baseDamage: number,
  critical: CriticalDamageCalculationInput,
): CriticalDamageResult {
  assertNonNegativeSafeInteger(baseDamage, "baseDamage");
  validateCriticalDamageCalculationInput(critical);
  const criticalDamagePercent = Math.max(MINIMUM_CRITICAL_DAMAGE_PERCENT, critical.damagePercent);

  if (!critical.enabled || !critical.triggered || baseDamage === 0) {
    return Object.freeze({
      criticalEnabled: critical.enabled,
      criticalTriggered: false,
      criticalDamagePercent,
      damage: baseDamage,
    });
  }

  const multipliedDamage = baseDamage * criticalDamagePercent;
  assertSafeIntegerResult(multipliedDamage, "criticalMultipliedDamage");

  return Object.freeze({
    criticalEnabled: true,
    criticalTriggered: true,
    criticalDamagePercent,
    damage: Math.floor(multipliedDamage / CRITICAL_DAMAGE_PERCENT_SCALE),
  });
}
