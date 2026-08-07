import type { EventEffectId } from "./event-effect-definition.ts";
import { EventEffectHandlerRegistry } from "./event-effect-handler-registry.ts";
import type {
  DeferredEventEffectInstruction,
  EventEffectDefinitionById,
  EventEffectExecutionContext,
  EventEffectExecutionResult,
  EventEffectHandler,
} from "./event-effect-handler.ts";

/** 描述基础业务系统向事件效果层提供的解耦操作接口。 */
export interface BasicEventEffectAdapter {
  modifyCharacterResource(
    effect: EventEffectDefinitionById<"characterResource.modify">,
    context: EventEffectExecutionContext,
  ): unknown;
  modifyCoin(
    effect: EventEffectDefinitionById<"coin.modify">,
    context: EventEffectExecutionContext,
  ): unknown;
  obtainItem(
    effect: EventEffectDefinitionById<"item.obtain">,
    context: EventEffectExecutionContext,
  ): unknown;
}

/** 当前尚未由事件核心直接执行、需要交给其他系统处理的效果标识。 */
const DEFERRED_EVENT_EFFECT_IDS = [
  "item.obtainFromPool",
  "status.add",
  "battle.start",
  "weather.change",
  "movement.teleport",
] as const satisfies readonly EventEffectId[];

/**
 * 方法名：createStandardEventEffectHandlerRegistry
 * 作用：创建包含三种基础适配器效果与全部预留外部指令效果的注册表。
 * @param adapter 角色资源、元宝与确定物品的实际业务操作适配器。
 * @returns 已注册全部当前标准效果的事件处理器注册表。
 */
export function createStandardEventEffectHandlerRegistry(
  adapter: BasicEventEffectAdapter,
): EventEffectHandlerRegistry {
  const registry = new EventEffectHandlerRegistry();

  registry.register(
    createAppliedHandler("characterResource.modify", (effect, context) =>
      adapter.modifyCharacterResource(effect, context),
    ),
  );
  registry.register(
    createAppliedHandler("coin.modify", (effect, context) => adapter.modifyCoin(effect, context)),
  );
  registry.register(
    createAppliedHandler("item.obtain", (effect, context) => adapter.obtainItem(effect, context)),
  );

  for (const effectId of DEFERRED_EVENT_EFFECT_IDS) {
    registry.register(createDeferredHandler(effectId));
  }

  return registry;
}

/**
 * 方法名：createAppliedHandler
 * 作用：将基础业务适配函数包装为标准事件效果处理器。
 * @param effectId 适配函数负责处理的事件效果标识。
 * @param apply 实际执行基础业务变更的适配函数。
 * @returns 返回 APPLIED 结果的类型安全事件效果处理器。
 */
function createAppliedHandler<EffectId extends EventEffectId>(
  effectId: EffectId,
  apply: (
    effect: EventEffectDefinitionById<EffectId>,
    context: EventEffectExecutionContext,
  ) => unknown,
): EventEffectHandler<EffectId> {
  return {
    effectId,
    execute(effect, context) {
      return {
        effectKey: effect.effectKey,
        effectId,
        outcome: "APPLIED",
        output: apply(effect, context),
      };
    },
  };
}

/**
 * 方法名：createDeferredHandler
 * 作用：为尚未接入的业务效果创建只生成外部处理指令的标准处理器。
 * @param effectId 需要延迟到外部业务系统执行的效果标识。
 * @returns 返回 DEFERRED 指令的类型安全事件效果处理器。
 */
function createDeferredHandler<EffectId extends EventEffectId>(
  effectId: EffectId,
): EventEffectHandler<EffectId, DeferredEventEffectInstruction> {
  return {
    effectId,
    execute(effect): EventEffectExecutionResult<EffectId, DeferredEventEffectInstruction> {
      return {
        effectKey: effect.effectKey,
        effectId,
        outcome: "DEFERRED",
        output: {
          effectId,
          targetType: effect.targetType,
          parameters: effect.parameters,
        },
      };
    },
  };
}
