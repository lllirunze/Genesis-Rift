import { MINIMUM_SUCCESSFUL_ATTACK_DAMAGE } from "./damage-config.ts";
import { assertNonNegativeSafeInteger } from "./damage-definition.ts";

/**
 * 方法名：calculateBaseDamage
 * 作用：使用合法攻击值减去有效防御，并按攻击规则决定是否应用最低伤害。
 * @param attackValue 已完成非负边界处理的攻击值。
 * @param effectiveDefense 已完成穿透处理的有效防御。
 * @param minimumDamageEnabled 当前攻击是否允许使用未被闪避后的最低伤害规则。
 * @returns 暴击之前的非负基础伤害。
 * @throws 攻击值或有效防御不是非负安全整数时抛出错误。
 */
export function calculateBaseDamage(
  attackValue: number,
  effectiveDefense: number,
  minimumDamageEnabled: boolean,
): number {
  assertNonNegativeSafeInteger(attackValue, "attackValue");
  assertNonNegativeSafeInteger(effectiveDefense, "effectiveDefense");

  if (attackValue === 0) {
    return 0;
  }

  const calculatedDamage = attackValue - effectiveDefense;

  return minimumDamageEnabled
    ? Math.max(MINIMUM_SUCCESSFUL_ATTACK_DAMAGE, calculatedDamage)
    : Math.max(0, calculatedDamage);
}
