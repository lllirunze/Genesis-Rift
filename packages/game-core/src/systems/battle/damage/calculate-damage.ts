import { calculateAttackValue } from "./calculate-attack-value.ts";
import { calculateBaseDamage } from "./calculate-base-damage.ts";
import { calculateCriticalDamage } from "./calculate-critical-damage.ts";
import { calculateEffectiveDefense } from "./calculate-effective-defense.ts";
import {
  validateDamageCalculationInput,
  type DamageCalculationInput,
  type DamageCalculationResult,
} from "./damage-definition.ts";

/**
 * 方法名：calculateDamage
 * 作用：统一完成攻击值、有效防御、基础伤害和暴击放大，不修改任何角色运行时状态。
 * @param input 物理、法术或真实伤害所需的完整整数输入。
 * @returns 可交给护盾与生命结算使用的不可变伤害计算结果。
 * @throws 任一输入非法或公式结果超出安全整数范围时抛出错误。
 */
export function calculateDamage(input: DamageCalculationInput): DamageCalculationResult {
  validateDamageCalculationInput(input);

  if (input.damageType === "TRUE") {
    const critical = calculateCriticalDamage(input.providedDamage, input.critical);

    return Object.freeze({
      damageType: input.damageType,
      attackValue: input.providedDamage,
      effectiveDefense: 0,
      baseDamage: input.providedDamage,
      criticalEnabled: critical.criticalEnabled,
      criticalTriggered: critical.criticalTriggered,
      criticalDamagePercent: critical.criticalDamagePercent,
      finalDamage: critical.damage,
    });
  }

  const attackValue = calculateAttackValue(
    input.characterAttack,
    input.weaponAttack,
    input.attackModifier,
  );
  const effectiveDefense = calculateEffectiveDefense(input.targetDefense, input.penetration);
  const baseDamage = calculateBaseDamage(attackValue, effectiveDefense, input.minimumDamageEnabled);
  const critical = calculateCriticalDamage(baseDamage, input.critical);

  return Object.freeze({
    damageType: input.damageType,
    attackValue,
    effectiveDefense,
    baseDamage,
    criticalEnabled: critical.criticalEnabled,
    criticalTriggered: critical.criticalTriggered,
    criticalDamagePercent: critical.criticalDamagePercent,
    finalDamage: critical.damage,
  });
}
