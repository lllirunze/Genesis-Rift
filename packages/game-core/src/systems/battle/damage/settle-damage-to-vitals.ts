import {
  validateDamageToVitalsInput,
  type DamageToVitalsInput,
  type DamageToVitalsResult,
} from "./damage-definition.ts";

/**
 * 方法名：settleDamageToVitals
 * 作用：将最终伤害依次分配给允许吸收该类型伤害的护盾和当前生命，并记录过量伤害。
 * @param input 伤害类型、最终伤害、当前护盾、当前生命和护盾吸收权限。
 * @returns 护盾、生命、过量伤害及首次击倒判断的不可变结果。
 * @throws 最终伤害、护盾、生命或伤害类型非法时抛出错误。
 */
export function settleDamageToVitals(input: DamageToVitalsInput): DamageToVitalsResult {
  validateDamageToVitalsInput(input);
  const shieldAbsorbed = input.shieldCanAbsorb
    ? Math.min(input.currentShield, input.finalDamage)
    : 0;
  const shieldAfter = input.currentShield - shieldAbsorbed;
  const damageToHealth = input.finalDamage - shieldAbsorbed;
  const healthAfter = Math.max(0, input.currentHealth - damageToHealth);
  const overkillDamage = Math.max(0, damageToHealth - input.currentHealth);

  return Object.freeze({
    damageType: input.damageType,
    finalDamage: input.finalDamage,
    shieldBefore: input.currentShield,
    shieldAbsorbed,
    shieldAfter,
    damageToHealth,
    healthBefore: input.currentHealth,
    healthAfter,
    overkillDamage,
    healthDepleted: healthAfter === 0,
    enteredDowned: input.currentHealth > 0 && healthAfter === 0,
  });
}
