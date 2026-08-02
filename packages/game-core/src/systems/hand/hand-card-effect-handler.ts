import type { HandCardEffectExecutionContext } from "./hand-card-effect-context.ts";
import { HAND_CARD_EFFECT_EXECUTION_OUTCOMES } from "./hand-card-config.ts";
import type { HandCardEffectDefinition, HandCardEffectId } from "./hand-card-definition.ts";

export type HandCardEffectExecutionOutcome = (typeof HAND_CARD_EFFECT_EXECUTION_OUTCOMES)[number];

export type HandCardEffectDefinitionById<EffectId extends HandCardEffectId> = Extract<
  HandCardEffectDefinition,
  { readonly effectId: EffectId }
>;

export interface HandCardEffectExecutionResult<
  EffectId extends HandCardEffectId = HandCardEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;
  readonly outcome: HandCardEffectExecutionOutcome;
  readonly output: Output | null;
}

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
