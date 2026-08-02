import type { HandCardEffectExecutionContext } from "./hand-card-effect-context.ts";
import { HAND_CARD_EFFECT_EXECUTION_OUTCOMES } from "./hand-card-config.ts";
import type { HandCardEffectDefinition, HandCardEffectId } from "./hand-card-definition.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardEffectExecutionOutcome = (typeof HAND_CARD_EFFECT_EXECUTION_OUTCOMES)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardEffectDefinitionById<EffectId extends HandCardEffectId> = Extract<
  HandCardEffectDefinition,
  { readonly effectId: EffectId }
>;

/** 描述业务操作完成后返回的结果。 */
export interface HandCardEffectExecutionResult<
  EffectId extends HandCardEffectId = HandCardEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;
  readonly outcome: HandCardEffectExecutionOutcome;
  readonly output: Output | null;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardEffectHandler<
  EffectId extends HandCardEffectId = HandCardEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;

  execute(
    effect: HandCardEffectDefinitionById<EffectId>,
    context: HandCardEffectExecutionContext,
  ): HandCardEffectExecutionResult<EffectId, Output>;
}
