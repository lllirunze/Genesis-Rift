import {
  assertNonNegativeSafeInteger,
  assertSafeInteger,
  assertSafeIntegerResult,
} from "./damage-definition.ts";

/**
 * 方法名：calculateAttackValue
 * 作用：将角色最终攻击、武器本体攻击和当前攻击方式修正相加，并将结果限制为非负整数。
 * @param characterAttack 角色数值系统已经计算完成的最终攻击属性。
 * @param weaponAttack 当前武器或施法媒介独立提供的攻击力。
 * @param attackModifier 技能或攻击方式对本次攻击提供的固定整数修正。
 * @returns 本次攻击进入防御计算前的合法攻击值。
 * @throws 输入不是合法整数或加总结果超出安全整数范围时抛出错误。
 */
export function calculateAttackValue(
  characterAttack: number,
  weaponAttack: number,
  attackModifier: number,
): number {
  assertNonNegativeSafeInteger(characterAttack, "characterAttack");
  assertNonNegativeSafeInteger(weaponAttack, "weaponAttack");
  assertSafeInteger(attackModifier, "attackModifier");
  const calculatedAttack = characterAttack + weaponAttack + attackModifier;
  assertSafeIntegerResult(calculatedAttack, "calculatedAttack");

  return Math.max(0, calculatedAttack);
}
