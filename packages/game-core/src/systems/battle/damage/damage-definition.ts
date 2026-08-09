import { DAMAGE_TYPES } from "./damage-config.ts";

/** 描述V1阶段支持的物理、法术与真实伤害。 */
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** 描述物理或法术攻击进入伤害公式前所需的整数数据。 */
export interface DefendedDamageCalculationInput {
  readonly damageType: "PHYSICAL" | "MAGICAL";
  readonly characterAttack: number;
  readonly weaponAttack: number;
  readonly attackModifier: number;
  readonly targetDefense: number;
  readonly penetration: number;
  readonly minimumDamageEnabled: boolean;
  readonly critical: CriticalDamageCalculationInput;
}

/** 描述绕过防御的真实伤害及其特殊暴击权限。 */
export interface TrueDamageCalculationInput {
  readonly damageType: "TRUE";
  readonly providedDamage: number;
  readonly critical: CriticalDamageCalculationInput;
}

/** 描述暴击阶段是否允许、是否已经触发及其整数伤害百分数。 */
export interface CriticalDamageCalculationInput {
  readonly enabled: boolean;
  readonly triggered: boolean;
  readonly damagePercent: number;
}

/** 描述一次纯伤害计算支持的全部输入形式。 */
export type DamageCalculationInput = DefendedDamageCalculationInput | TrueDamageCalculationInput;

/** 描述一次攻击从攻击值到最终伤害的完整纯计算结果。 */
export interface DamageCalculationResult {
  readonly damageType: DamageType;
  readonly attackValue: number;
  readonly effectiveDefense: number;
  readonly baseDamage: number;
  readonly criticalEnabled: boolean;
  readonly criticalTriggered: boolean;
  readonly criticalDamagePercent: number;
  readonly finalDamage: number;
}

/** 描述最终伤害进入护盾与生命结算前的运行时数值。 */
export interface DamageToVitalsInput {
  readonly damageType: DamageType;
  readonly finalDamage: number;
  readonly currentShield: number;
  readonly currentHealth: number;
  readonly shieldCanAbsorb: boolean;
}

/** 描述护盾吸收、生命扣除、过量伤害及首次击倒判断结果。 */
export interface DamageToVitalsResult {
  readonly damageType: DamageType;
  readonly finalDamage: number;
  readonly shieldBefore: number;
  readonly shieldAbsorbed: number;
  readonly shieldAfter: number;
  readonly damageToHealth: number;
  readonly healthBefore: number;
  readonly healthAfter: number;
  readonly overkillDamage: number;
  readonly healthDepleted: boolean;
  readonly enteredDowned: boolean;
}

/**
 * 方法名：validateDamageCalculationInput
 * 作用：校验伤害类型对应的攻击、防御、穿透与暴击输入均为合法整数。
 * @param input 需要校验的纯伤害计算输入。
 * @returns 无返回值。
 * @throws 伤害类型不受支持、字段为负数或使用非安全整数时抛出错误。
 */
export function validateDamageCalculationInput(input: DamageCalculationInput): void {
  if (!DAMAGE_TYPES.includes(input.damageType)) {
    throw new RangeError(`Unsupported damage type: ${input.damageType as string}`);
  }

  validateCriticalDamageCalculationInput(input.critical);

  if (input.damageType === "TRUE") {
    assertNonNegativeSafeInteger(input.providedDamage, "providedDamage");
    return;
  }

  assertNonNegativeSafeInteger(input.characterAttack, "characterAttack");
  assertNonNegativeSafeInteger(input.weaponAttack, "weaponAttack");
  assertSafeInteger(input.attackModifier, "attackModifier");
  assertNonNegativeSafeInteger(input.targetDefense, "targetDefense");
  assertNonNegativeSafeInteger(input.penetration, "penetration");
  assertBoolean(input.minimumDamageEnabled, "minimumDamageEnabled");
}

/**
 * 方法名：validateCriticalDamageCalculationInput
 * 作用：校验暴击开关、触发结果和整数百分数之间的一致性。
 * @param input 需要校验的暴击计算输入。
 * @returns 无返回值。
 * @throws 暴击百分数非法或禁用暴击却标记为触发时抛出错误。
 */
export function validateCriticalDamageCalculationInput(
  input: CriticalDamageCalculationInput,
): void {
  assertBoolean(input.enabled, "critical.enabled");
  assertBoolean(input.triggered, "critical.triggered");
  assertNonNegativeSafeInteger(input.damagePercent, "critical.damagePercent");

  if (!input.enabled && input.triggered) {
    throw new Error("Critical damage cannot trigger when critical is disabled");
  }
}

/**
 * 方法名：validateDamageToVitalsInput
 * 作用：校验最终伤害、当前护盾和当前生命均可安全参与承伤计算。
 * @param input 需要校验的护盾与生命结算输入。
 * @returns 无返回值。
 * @throws 伤害类型不受支持或任一数值不是非负安全整数时抛出错误。
 */
export function validateDamageToVitalsInput(input: DamageToVitalsInput): void {
  if (!DAMAGE_TYPES.includes(input.damageType)) {
    throw new RangeError(`Unsupported damage type: ${input.damageType as string}`);
  }

  assertNonNegativeSafeInteger(input.finalDamage, "finalDamage");
  assertNonNegativeSafeInteger(input.currentShield, "currentShield");
  assertNonNegativeSafeInteger(input.currentHealth, "currentHealth");
  assertBoolean(input.shieldCanAbsorb, "shieldCanAbsorb");
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验数值是大于或等于零的安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值为负数、小数或超出安全整数范围时抛出错误。
 */
export function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/**
 * 方法名：assertSafeInteger
 * 作用：校验数值是允许参与战斗公式的安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值为小数或超出安全整数范围时抛出错误。
 */
export function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
}

/**
 * 方法名：assertSafeIntegerResult
 * 作用：校验公式中间结果仍处于JavaScript安全整数范围。
 * @param value 公式完成一步计算后得到的数值。
 * @param field 出现在错误信息中的结果名称。
 * @returns 无返回值。
 * @throws 中间结果超出安全整数范围时抛出错误。
 */
export function assertSafeIntegerResult(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${field} exceeds the safe integer range`);
  }
}

/**
 * 方法名：assertBoolean
 * 作用：校验外部输入使用真正的布尔值而不是字符串或数字替代。
 * @param value 需要校验的值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是布尔值时抛出错误。
 */
function assertBoolean(value: boolean, field: string): void {
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} must be a boolean`);
  }
}
