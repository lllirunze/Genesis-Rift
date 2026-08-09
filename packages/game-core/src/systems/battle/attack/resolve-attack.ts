import type { RandomStream } from "../../random/core/random-stream.ts";
import { resolveCriticalCheck } from "../critical/index.ts";
import {
  calculateDamage,
  settleDamageToVitals,
  type DamageCalculationInput,
} from "../damage/index.ts";
import {
  EVASION_RATE_SCALE,
  resolveEvasionCheck,
  validateEvasionCheckInput,
} from "../evasion/index.ts";

import {
  validateAttackContext,
  validateAttackDefenseResolution,
  validateAttackVitalSnapshot,
  type AttackResolutionResult,
  type ResolveAttackInput,
} from "./attack-definition.ts";

/**
 * 方法名：resolveAttack
 * 作用：按主动防御、自然闪避、伤害、暴击与生命结算的固定顺序完成一次基础攻击。
 * @param randomStream 当前对局的战斗随机流。
 * @param input 已通过攻击合法性检查且已支付攻击成本的攻击输入。
 * @returns 包含各阶段结构化结果的基础攻击结算结果。
 * @throws 攻击上下文、伤害输入或目标生命快照不一致时抛出错误。
 */
export function resolveAttack(
  randomStream: RandomStream,
  input: ResolveAttackInput,
): AttackResolutionResult {
  validateAttackContext(input.context);
  validateAttackDefenseResolution(input.defense);
  validateAttackVitalSnapshot(input.targetVitals);
  validateDamageTypeConsistency(input);
  const defense = normalizeAttackDefenseResolution(input.defense);
  validateEvasionEnabled(input.evasionEnabled);
  validateEvasionCheckInput({ evasionEnabled: true, targetEvasionRate: input.targetEvasionRate });

  if (defense.cancelled) {
    return Object.freeze({
      context: input.context,
      outcome: "CANCELLED",
      defense,
      evasion: null,
      critical: null,
      damage: null,
      vitals: null,
    });
  }

  const evasion = resolveEvasionCheck(randomStream, {
    evasionEnabled: input.evasionEnabled ?? true,
    targetEvasionRate: applyEvasionModifier(input.targetEvasionRate, defense.evasionRateModifier),
  });

  if (evasion.evaded) {
    return Object.freeze({
      context: input.context,
      outcome: "EVADED",
      defense,
      evasion,
      critical: null,
      damage: null,
      vitals: null,
    });
  }

  const damageInput = withAttackValueModifier(input.damage, defense.attackValueModifier);
  const baseDamage = calculateDamage(withResolvedCritical(damageInput, false, false));
  const critical = resolveCriticalCheck(randomStream, {
    criticalEnabled: damageInput.critical.enabled && baseDamage.baseDamage > 0,
    sourceCriticalRate: input.sourceCriticalRate,
  });
  const damage = calculateDamage(
    withResolvedCritical(damageInput, critical.criticalEnabled, critical.critical),
  );
  const vitals = settleDamageToVitals({
    damageType: damage.damageType,
    finalDamage: damage.finalDamage,
    currentShield: input.targetVitals.currentShield + defense.shieldGranted,
    currentHealth: input.targetVitals.currentHealth,
    shieldCanAbsorb: input.targetVitals.shieldCanAbsorb,
  });

  return Object.freeze({
    context: input.context,
    outcome: "RESOLVED",
    defense,
    evasion,
    critical,
    damage,
    vitals,
  });
}

/**
 * 方法名：validateEvasionEnabled
 * 作用：校验攻击来源是否允许自然闪避的可选覆盖值。
 * @param evasionEnabled 未提供时表示遵循标准攻击流程的自然闪避规则。
 * @returns 无返回值。
 * @throws 输入不是布尔值时抛出错误。
 */
function validateEvasionEnabled(evasionEnabled: boolean | undefined): void {
  if (evasionEnabled !== undefined && typeof evasionEnabled !== "boolean") {
    throw new TypeError("evasionEnabled must be a boolean when provided");
  }
}

/**
 * 方法名：normalizeAttackDefenseResolution
 * 作用：将可选的主动防御修正展开为攻击流程可直接使用的完整整数结果。
 * @param defense 已通过基础校验的主动防御结果。
 * @returns 字段完整且不可变的主动防御结果。
 */
function normalizeAttackDefenseResolution(
  defense: ResolveAttackInput["defense"],
): Required<AttackResolutionResult["defense"]> {
  return Object.freeze({
    cancelled: defense.cancelled,
    evasionRateModifier: defense.evasionRateModifier ?? 0,
    attackValueModifier: defense.attackValueModifier ?? 0,
    shieldGranted: defense.shieldGranted ?? 0,
    resolvedResponseIds: Object.freeze([...(defense.resolvedResponseIds ?? [])]),
  });
}

/**
 * 方法名：applyEvasionModifier
 * 作用：将主动防御对本次闪避率的修正限制在百分制合法边界内。
 * @param targetEvasionRate 防守方已计算完成的基础闪避率。
 * @param modifier 主动防御产生的本次攻击闪避修正。
 * @returns 可交给自然闪避判定使用的最终闪避率。
 * @throws 闪避率或修正的加法结果超出安全整数范围时抛出错误。
 */
function applyEvasionModifier(targetEvasionRate: number, modifier: number): number {
  const result = targetEvasionRate + modifier;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Resolved evasion rate exceeds the safe integer range");
  }

  return Math.min(Math.max(result, 0), EVASION_RATE_SCALE);
}

/**
 * 方法名：withAttackValueModifier
 * 作用：将主动防御对本次攻击值的修正合并到伤害计算输入。
 * @param damage 原始伤害计算输入。
 * @param modifier 主动防御产生的攻击值修正。
 * @returns 包含本次攻击值修正的伤害计算输入。
 * @throws 攻击修正累加结果超出安全整数范围时抛出错误。
 */
function withAttackValueModifier(
  damage: DamageCalculationInput,
  modifier: number,
): DamageCalculationInput {
  if (damage.damageType === "TRUE") {
    return damage;
  }

  const attackModifier = damage.attackModifier + modifier;

  if (!Number.isSafeInteger(attackModifier)) {
    throw new RangeError("Resolved attack modifier exceeds the safe integer range");
  }

  return { ...damage, attackModifier };
}

/**
 * 方法名：validateDamageTypeConsistency
 * 作用：确保攻击上下文与伤害计算输入描述同一种伤害类型。
 * @param input 当前基础攻击流程的完整输入。
 * @returns 无返回值。
 * @throws 上下文伤害类型与伤害计算输入不一致时抛出错误。
 */
function validateDamageTypeConsistency(input: ResolveAttackInput): void {
  if (input.context.damageType !== input.damage.damageType) {
    throw new Error("Attack context damage type must match damage calculation input");
  }
}

/**
 * 方法名：withResolvedCritical
 * 作用：使用当前攻击流程已经确定的暴击开关与结果生成伤害计算输入。
 * @param damage 原始伤害计算输入。
 * @param enabled 当前攻击是否允许进入暴击阶段。
 * @param triggered 当前攻击是否已经触发暴击。
 * @returns 可直接交给纯伤害计算模块的不可变输入。
 */
function withResolvedCritical(
  damage: DamageCalculationInput,
  enabled: boolean,
  triggered: boolean,
): DamageCalculationInput {
  return {
    ...damage,
    critical: {
      ...damage.critical,
      enabled,
      triggered,
    },
  };
}
