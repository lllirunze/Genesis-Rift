import type {
  DamageCalculationInput,
  DamageCalculationResult,
  DamageToVitalsResult,
} from "../damage/index.ts";
import type { CriticalCheckResult } from "../critical/index.ts";
import type { EvasionCheckResult } from "../evasion/index.ts";

import { ATTACK_RESOLUTION_OUTCOMES, ATTACK_SOURCE_TYPES } from "./attack-config.ts";

/** 描述当前模块对外公开的攻击来源分类。 */
export type AttackSourceType = (typeof ATTACK_SOURCE_TYPES)[number];
/** 描述当前模块对外公开的攻击结算结果分类。 */
export type AttackResolutionOutcome = (typeof ATTACK_RESOLUTION_OUTCOMES)[number];

/** 描述攻击正式发起时已经锁定的基础信息。 */
export interface AttackContext {
  readonly attackId: string;
  readonly parentFlowId: string | null;
  readonly attackerId: string;
  readonly defenderId: string;
  readonly sourceType: AttackSourceType;
  readonly sourceId: string | null;
  readonly damageType: DamageCalculationInput["damageType"];
  readonly actionConsumed: boolean;
  readonly movementPointsConsumed: number;
}

/** 描述建立攻击上下文所需的输入。 */
export type CreateAttackContextInput = AttackContext;

/** 描述主动防御阶段已经确认的基础结果。 */
export interface AttackDefenseResolution {
  readonly cancelled: boolean;
  readonly evasionRateModifier?: number;
  readonly attackValueModifier?: number;
  readonly shieldGranted?: number;
  readonly resolvedResponseIds?: readonly string[];
}

/** 描述护盾与生命结算前需要读取的目标运行时数值。 */
export interface AttackVitalSnapshot {
  readonly currentShield: number;
  readonly currentHealth: number;
  readonly shieldCanAbsorb: boolean;
}

/** 描述基础攻击流程编排所需的已确认输入。 */
export interface ResolveAttackInput {
  readonly context: AttackContext;
  readonly defense: AttackDefenseResolution;
  readonly evasionEnabled?: boolean;
  readonly targetEvasionRate: number;
  readonly sourceCriticalRate: number;
  readonly damage: DamageCalculationInput;
  readonly targetVitals: AttackVitalSnapshot;
}

/** 描述一次基础攻击流程完成后的结构化结果。 */
export interface AttackResolutionResult {
  readonly context: AttackContext;
  readonly outcome: AttackResolutionOutcome;
  readonly defense: AttackDefenseResolution;
  readonly evasion: EvasionCheckResult | null;
  readonly critical: CriticalCheckResult | null;
  readonly damage: DamageCalculationResult | null;
  readonly vitals: DamageToVitalsResult | null;
}

/**
 * 方法名：createAttackContext
 * 作用：校验并冻结攻击正式发起后不可随意替换的基础信息。
 * @param input 建立攻击上下文所需的输入。
 * @returns 已校验且不可变的攻击上下文。
 * @throws 攻击标识、参与者、来源或行动消耗信息不合法时抛出错误。
 */
export function createAttackContext(input: CreateAttackContextInput): AttackContext {
  validateAttackContext(input);
  return Object.freeze({ ...input });
}

/**
 * 方法名：validateAttackContext
 * 作用：校验攻击上下文中的标识、来源、伤害类型与行动消耗摘要。
 * @param context 需要校验的攻击上下文。
 * @returns 无返回值。
 * @throws 任一字段不满足基础攻击上下文约束时抛出错误。
 */
export function validateAttackContext(context: AttackContext): void {
  assertNonEmptyString(context.attackId, "attackId");
  assertNullableNonEmptyString(context.parentFlowId, "parentFlowId");
  assertNonEmptyString(context.attackerId, "attackerId");
  assertNonEmptyString(context.defenderId, "defenderId");
  assertNullableNonEmptyString(context.sourceId, "sourceId");

  if (context.attackerId === context.defenderId) {
    throw new Error("attackerId and defenderId must be different");
  }

  if (!ATTACK_SOURCE_TYPES.includes(context.sourceType)) {
    throw new RangeError(`Unsupported attack source type: ${context.sourceType}`);
  }

  if (!isSupportedDamageType(context.damageType)) {
    throw new RangeError(`Unsupported attack damage type: ${context.damageType}`);
  }

  if (typeof context.actionConsumed !== "boolean") {
    throw new TypeError("actionConsumed must be a boolean");
  }

  if (!Number.isSafeInteger(context.movementPointsConsumed) || context.movementPointsConsumed < 0) {
    throw new RangeError("movementPointsConsumed must be a non-negative safe integer");
  }
}

/**
 * 方法名：validateAttackDefenseResolution
 * 作用：校验主动防御阶段是否已经明确给出取消攻击的结果。
 * @param defense 需要校验的主动防御结果。
 * @returns 无返回值。
 * @throws 主动防御结果不是合法布尔值时抛出错误。
 */
export function validateAttackDefenseResolution(defense: AttackDefenseResolution): void {
  if (typeof defense.cancelled !== "boolean") {
    throw new TypeError("defense.cancelled must be a boolean");
  }

  assertOptionalSafeInteger(defense.evasionRateModifier, "defense.evasionRateModifier");
  assertOptionalSafeInteger(defense.attackValueModifier, "defense.attackValueModifier");

  if (
    defense.shieldGranted !== undefined &&
    (!Number.isSafeInteger(defense.shieldGranted) || defense.shieldGranted < 0)
  ) {
    throw new RangeError("defense.shieldGranted must be a non-negative safe integer");
  }

  if (defense.resolvedResponseIds !== undefined) {
    const responseIds = new Set<string>();

    for (const responseId of defense.resolvedResponseIds) {
      assertNonEmptyString(responseId, "defense.resolvedResponseIds");

      if (responseIds.has(responseId)) {
        throw new Error(`Duplicate defense response id: ${responseId}`);
      }

      responseIds.add(responseId);
    }
  }
}

/**
 * 方法名：validateAttackVitalSnapshot
 * 作用：校验目标在护盾与生命结算前的运行时数值。
 * @param vitals 需要校验的目标运行时数值。
 * @returns 无返回值。
 * @throws 护盾、生命或护盾吸收权限不合法时抛出错误。
 */
export function validateAttackVitalSnapshot(vitals: AttackVitalSnapshot): void {
  if (!Number.isSafeInteger(vitals.currentShield) || vitals.currentShield < 0) {
    throw new RangeError("targetVitals.currentShield must be a non-negative safe integer");
  }

  if (!Number.isSafeInteger(vitals.currentHealth) || vitals.currentHealth < 0) {
    throw new RangeError("targetVitals.currentHealth must be a non-negative safe integer");
  }

  if (typeof vitals.shieldCanAbsorb !== "boolean") {
    throw new TypeError("targetVitals.shieldCanAbsorb must be a boolean");
  }
}

/**
 * 方法名：isSupportedDamageType
 * 作用：判断输入是否属于 V1 支持的伤害类型。
 * @param damageType 需要判断的伤害类型。
 * @returns 输入是否属于物理、法术或真实伤害。
 */
function isSupportedDamageType(damageType: DamageCalculationInput["damageType"]): boolean {
  return damageType === "PHYSICAL" || damageType === "MAGICAL" || damageType === "TRUE";
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否为非空字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是非空字符串时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/**
 * 方法名：assertNullableNonEmptyString
 * 作用：校验输入为 null 或非空字符串。
 * @param value 需要校验的可空字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入既不是 null 也不是非空字符串时抛出错误。
 */
function assertNullableNonEmptyString(value: string | null, field: string): void {
  if (value !== null) {
    assertNonEmptyString(value, field);
  }
}

/**
 * 方法名：assertOptionalSafeInteger
 * 作用：校验输入为 undefined 或可安全参与战斗计算的整数。
 * @param value 需要校验的可选整数。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入存在但不是安全整数时抛出错误。
 */
function assertOptionalSafeInteger(value: number | undefined, field: string): void {
  if (value !== undefined && !Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
}
