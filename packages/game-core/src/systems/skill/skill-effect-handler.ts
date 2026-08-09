import type { SkillEffectDefinition, SkillEffectType } from "./skill-definition.ts";

/** 描述一次技能效果执行时由上层流程提供的参与者与目标信息。 */
export interface SkillEffectExecutionContext {
  readonly executionId: string;
  readonly casterId: string;
  readonly targetIds: readonly string[];
}

/** 描述单项技能效果完成后的标准结果。 */
export interface SkillEffectExecutionResult<Output = unknown> {
  readonly effectId: string;
  readonly outcome: "applied" | "skipped";
  readonly output: Output | null;
}

/** 描述可注册到技能效果执行器的单项效果处理器。 */
export interface SkillEffectHandler<EffectType extends SkillEffectType = SkillEffectType> {
  readonly effectType: EffectType;

  execute(
    effect: SkillEffectDefinition,
    context: SkillEffectExecutionContext,
  ): SkillEffectExecutionResult;
}

/** 描述以效果类型索引技能效果处理器的注册表。 */
export class SkillEffectHandlerRegistry {
  private readonly handlers = new Map<SkillEffectType, SkillEffectHandler>();

  /**
   * 方法名：register
   * 作用：注册一个效果类型唯一的技能效果处理器。
   * @param handler 需要注册的技能效果处理器。
   * @returns 当前注册表，便于连续注册多个处理器。
   * @throws 同一效果类型已注册处理器时抛出错误。
   */
  register(handler: SkillEffectHandler): this {
    if (this.handlers.has(handler.effectType)) {
      throw new Error(`Skill effect handler already registered: ${handler.effectType}`);
    }

    this.handlers.set(handler.effectType, handler);
    return this;
  }

  /**
   * 方法名：get
   * 作用：读取指定效果类型的处理器，不修改注册表状态。
   * @param effectType 需要读取的技能效果类型。
   * @returns 已注册的处理器；未注册时返回 null。
   */
  get(effectType: SkillEffectType): SkillEffectHandler | null {
    return this.handlers.get(effectType) ?? null;
  }
}
