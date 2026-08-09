import type {
  EquipmentActiveEffectDefinition,
  EquipmentActiveEffectType,
} from "./equipment-active-ability-definition.ts";

/** 描述装备主动能力效果执行时所需的参与者和目标信息。 */
export interface EquipmentActiveEffectExecutionContext {
  readonly executionId: string;
  readonly ownerId: string;
  readonly equipmentInstanceId: string;
  readonly targetIds: readonly string[];
}

/** 描述一项装备主动效果的结构化执行结果。 */
export interface EquipmentActiveEffectExecutionResult<Output = unknown> {
  readonly effectId: string;
  readonly outcome: "applied" | "skipped";
  readonly output: Output | null;
}

/** 描述可注册到装备主动能力流程的单项效果处理器。 */
export interface EquipmentActiveEffectHandler<
  EffectType extends EquipmentActiveEffectType = EquipmentActiveEffectType,
> {
  readonly effectType: EffectType;

  execute(
    effect: Extract<EquipmentActiveEffectDefinition, { readonly effectType: EffectType }>,
    context: EquipmentActiveEffectExecutionContext,
  ): EquipmentActiveEffectExecutionResult;
}

/** 管理装备主动能力效果类型与处理器之间的一对一映射。 */
export class EquipmentActiveEffectHandlerRegistry {
  private readonly handlers = new Map<EquipmentActiveEffectType, EquipmentActiveEffectHandler>();

  /**
   * 方法名：register
   * 作用：注册一个唯一的装备主动效果处理器。
   * @param handler 需要注册的效果处理器。
   * @returns 当前注册表，便于连续注册多个处理器。
   * @throws 同一效果类型已注册处理器时抛出错误。
   */
  register(handler: EquipmentActiveEffectHandler): this {
    if (this.handlers.has(handler.effectType)) {
      throw new Error(`Equipment active effect handler already registered: ${handler.effectType}`);
    }

    this.handlers.set(handler.effectType, handler);
    return this;
  }

  /**
   * 方法名：get
   * 作用：读取指定主动效果类型的处理器。
   * @param effectType 需要查询的主动效果类型。
   * @returns 已注册处理器；未注册时返回 null。
   */
  get(effectType: EquipmentActiveEffectType): EquipmentActiveEffectHandler | null {
    return this.handlers.get(effectType) ?? null;
  }
}
