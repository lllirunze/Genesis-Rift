import type {
  EventEffectDefinition,
  EventEffectId,
  EventEffectTargetType,
} from "./event-effect-definition.ts";
import { EVENT_EFFECT_EXECUTION_OUTCOMES } from "./event-runtime-config.ts";

/** 描述事件效果处理器可以返回的执行状态。 */
export type EventEffectExecutionOutcome = (typeof EVENT_EFFECT_EXECUTION_OUTCOMES)[number];

/** 根据效果标识提取对应的类型安全效果定义。 */
export type EventEffectDefinitionById<EffectId extends EventEffectId> = Extract<
  EventEffectDefinition,
  { readonly effectId: EffectId }
>;

/** 描述单项事件效果执行时所需的公共上下文。 */
export interface EventEffectExecutionContext {
  readonly instanceId: string;
  readonly eventId: string;
  readonly triggeringPlayerId: string | null;
  readonly selectedOptionId: string | null;
  readonly effectIndex: number;
  readonly resolvedAtTurn: number;
}

/** 描述尚未由事件核心直接处理的外部业务指令。 */
export interface DeferredEventEffectInstruction {
  readonly effectId: EventEffectId;
  readonly targetType: EventEffectTargetType;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/** 描述单项事件效果执行后形成的稳定结果。 */
export interface EventEffectExecutionResult<
  EffectId extends EventEffectId = EventEffectId,
  Output = unknown,
> {
  readonly effectKey: string;
  readonly effectId: EffectId;
  readonly outcome: EventEffectExecutionOutcome;
  readonly output: Output | null;
  readonly failureReason?: string;
}

/** 描述能够执行某一种标准事件效果的处理器。 */
export interface EventEffectHandler<
  EffectId extends EventEffectId = EventEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;

  execute(
    effect: EventEffectDefinitionById<EffectId>,
    context: EventEffectExecutionContext,
  ): EventEffectExecutionResult<EffectId, Output>;
}
