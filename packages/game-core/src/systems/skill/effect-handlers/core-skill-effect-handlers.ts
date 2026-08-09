import type {
  SkillAttackEffect,
  SkillEffectDefinition,
  SkillForcedDisplacementEffect,
  SkillResourceRestoreEffect,
  SkillShieldGrantEffect,
  SkillStatusAddEffect,
} from "../skill-definition.ts";
import type {
  SkillEffectExecutionContext,
  SkillEffectExecutionResult,
  SkillEffectHandler,
} from "../skill-effect-handler.ts";

/** 描述技能标准效果转发到现有业务系统时所需的依赖入口。 */
export interface CoreSkillEffectHandlerDependencies {
  readonly resolveAttack: (
    effect: SkillAttackEffect,
    context: SkillEffectExecutionContext,
  ) => unknown;
  readonly applyStatus: (
    effect: SkillStatusAddEffect,
    context: SkillEffectExecutionContext,
  ) => unknown;
  readonly restoreResource: (
    effect: SkillResourceRestoreEffect,
    context: SkillEffectExecutionContext,
  ) => unknown;
  readonly grantShield: (
    effect: SkillShieldGrantEffect,
    context: SkillEffectExecutionContext,
  ) => unknown;
  readonly settleForcedDisplacement: (
    effect: SkillForcedDisplacementEffect,
    context: SkillEffectExecutionContext,
  ) => unknown;
}

/**
 * 方法名：createSkillAttackEffectHandler
 * 作用：创建将技能攻击效果转发给统一战斗攻击流程的处理器。
 * @param dependencies 当前技能效果适配器所需的业务依赖。
 * @returns 可注册到技能效果注册表的攻击效果处理器。
 */
export function createSkillAttackEffectHandler(
  dependencies: CoreSkillEffectHandlerDependencies,
): SkillEffectHandler<"attack"> {
  return createForwardingHandler("attack", dependencies.resolveAttack);
}

/**
 * 方法名：createSkillStatusAddEffectHandler
 * 作用：创建将技能状态附加效果转发给状态系统的处理器。
 * @param dependencies 当前技能效果适配器所需的业务依赖。
 * @returns 可注册到技能效果注册表的状态附加处理器。
 */
export function createSkillStatusAddEffectHandler(
  dependencies: CoreSkillEffectHandlerDependencies,
): SkillEffectHandler<"status_add"> {
  return createForwardingHandler("status_add", dependencies.applyStatus);
}

/**
 * 方法名：createSkillResourceRestoreEffectHandler
 * 作用：创建将技能资源恢复效果转发给角色资源系统的处理器。
 * @param dependencies 当前技能效果适配器所需的业务依赖。
 * @returns 可注册到技能效果注册表的资源恢复处理器。
 */
export function createSkillResourceRestoreEffectHandler(
  dependencies: CoreSkillEffectHandlerDependencies,
): SkillEffectHandler<"resource_restore"> {
  return createForwardingHandler("resource_restore", dependencies.restoreResource);
}

/**
 * 方法名：createSkillShieldGrantEffectHandler
 * 作用：创建将技能护盾效果转发给生命与护盾系统的处理器。
 * @param dependencies 当前技能效果适配器所需的业务依赖。
 * @returns 可注册到技能效果注册表的护盾处理器。
 */
export function createSkillShieldGrantEffectHandler(
  dependencies: CoreSkillEffectHandlerDependencies,
): SkillEffectHandler<"shield_grant"> {
  return createForwardingHandler("shield_grant", dependencies.grantShield);
}

/**
 * 方法名：createSkillForcedDisplacementEffectHandler
 * 作用：创建将技能强制位移效果转发给地图位移系统的处理器。
 * @param dependencies 当前技能效果适配器所需的业务依赖。
 * @returns 可注册到技能效果注册表的强制位移处理器。
 */
export function createSkillForcedDisplacementEffectHandler(
  dependencies: CoreSkillEffectHandlerDependencies,
): SkillEffectHandler<"forced_displacement"> {
  return createForwardingHandler("forced_displacement", dependencies.settleForcedDisplacement);
}

/**
 * 方法名：createForwardingHandler
 * 作用：将一个已校验的技能效果转发至对应业务模块，并统一包装执行结果。
 * @param effectType 当前处理器负责的技能效果类型。
 * @param execute 对应业务模块提供的具体结算入口。
 * @returns 固定处理单一效果类型的技能效果处理器。
 */
function createForwardingHandler<EffectType extends SkillEffectDefinition["effectType"]>(
  effectType: EffectType,
  execute: (
    effect: Extract<SkillEffectDefinition, { readonly effectType: EffectType }>,
    context: SkillEffectExecutionContext,
  ) => unknown,
): SkillEffectHandler<EffectType> {
  return {
    effectType,
    execute(effect, context): SkillEffectExecutionResult {
      if (effect.effectType !== effectType) {
        throw new Error(`Unexpected skill effect type: ${effect.effectType}`);
      }

      return Object.freeze({
        effectId: effect.effectId,
        outcome: "applied",
        output: execute(
          effect as Extract<SkillEffectDefinition, { readonly effectType: EffectType }>,
          context,
        ),
      });
    },
  };
}
