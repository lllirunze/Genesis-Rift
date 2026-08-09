import { assertNonNegativeSafeInteger } from "./damage-definition.ts";

/**
 * 方法名：calculateEffectiveDefense
 * 作用：使用对应穿透削减目标防御，并禁止溢出穿透产生负防御。
 * @param targetDefense 目标已经计算完成的最终物理防御或法术抗性。
 * @param penetration 攻击方对应的护甲穿透或法术穿透。
 * @returns 本次攻击实际参与伤害扣减的非负有效防御。
 * @throws 防御或穿透不是非负安全整数时抛出错误。
 */
export function calculateEffectiveDefense(targetDefense: number, penetration: number): number {
  assertNonNegativeSafeInteger(targetDefense, "targetDefense");
  assertNonNegativeSafeInteger(penetration, "penetration");

  return Math.max(0, targetDefense - penetration);
}
