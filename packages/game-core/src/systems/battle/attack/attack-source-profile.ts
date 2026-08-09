import type { DamageCalculationInput } from "../damage/index.ts";

import {
  createAttackContext,
  type AttackContext,
  type AttackSourceType,
} from "./attack-definition.ts";
import type { AttackResourceCost } from "./commit-attack-initiation.ts";

/** 描述技能、装备、手牌等来源转换为统一攻击流程时必须提供的配置。 */
export interface AttackSourceProfile {
  readonly sourceType: AttackSourceType;
  readonly sourceId: string | null;
  readonly damage: DamageCalculationInput;
  readonly resourceCosts: readonly AttackResourceCost[];
  readonly evasionEnabled: boolean;
}

/** 描述由攻击来源配置补全后可交给攻击流程的固定输入。 */
export interface PreparedAttackSource {
  readonly context: AttackContext;
  readonly damage: DamageCalculationInput;
  readonly resourceCosts: readonly AttackResourceCost[];
  readonly evasionEnabled: boolean;
}

/**
 * 方法名：prepareAttackSource
 * 作用：将技能、装备、手牌、状态等来源配置转换为统一攻击上下文和固定攻击参数。
 * @param contextInput 本次攻击与参与者相关的运行时上下文，不包含来源和伤害定义。
 * @param profile 攻击来源提供的伤害、资源成本与闪避规则配置。
 * @returns 可依次传给合法性检查、成本提交和伤害结算的不可变攻击来源数据。
 * @throws 来源类型与来源标识不匹配，或成本、伤害配置不合法时抛出错误。
 */
export function prepareAttackSource(
  contextInput: Omit<AttackContext, "sourceType" | "sourceId" | "damageType">,
  profile: AttackSourceProfile,
): PreparedAttackSource {
  validateAttackSourceProfile(profile);

  const context = createAttackContext({
    ...contextInput,
    sourceType: profile.sourceType,
    sourceId: profile.sourceId,
    damageType: profile.damage.damageType,
  });

  return Object.freeze({
    context,
    damage: profile.damage,
    resourceCosts: Object.freeze([...profile.resourceCosts]),
    evasionEnabled: profile.evasionEnabled,
  });
}

/**
 * 方法名：validateAttackSourceProfile
 * 作用：校验攻击来源配置的来源标识、伤害输入和自然闪避规则。
 * @param profile 需要校验的攻击来源配置。
 * @returns 无返回值。
 * @throws 普通攻击携带来源标识，或特殊来源缺少资源标识时抛出错误。
 */
export function validateAttackSourceProfile(profile: AttackSourceProfile): void {
  if (typeof profile.evasionEnabled !== "boolean") {
    throw new TypeError("profile.evasionEnabled must be a boolean");
  }

  if (profile.sourceType === "normal" && profile.sourceId !== null) {
    throw new Error("Normal attacks must not have a source id");
  }

  if (profile.sourceType !== "normal" && !isNonEmptyString(profile.sourceId)) {
    throw new Error("Special attack sources must have a source id");
  }
}

/**
 * 方法名：isNonEmptyString
 * 作用：判断未知来源标识是否是有效的非空字符串。
 * @param value 需要判断的来源标识。
 * @returns 输入为非空字符串时返回 true。
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
