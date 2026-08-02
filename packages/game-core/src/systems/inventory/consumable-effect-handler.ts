import type { CharacterStatusState } from "../battle/status/index.ts";
import type { CharacterResourceState } from "../character/index.ts";
import type {
  ConsumableEffectDefinition,
  ConsumableEffectExecutionOutcome,
  ConsumableEffectId,
} from "./consumable-definition.ts";

export interface ConsumableEffectState {
  readonly resourceState: CharacterResourceState<string>;
  readonly statusState: CharacterStatusState;
}

export interface ConsumableEffectExecutionContext {
  readonly playerId: string;
  readonly itemDefinitionId: string;
  readonly effectIndex: number;
  readonly state: ConsumableEffectState;
  readonly createdAtSequence: number;
  readonly createStatusInstanceId: (effectIndex: number, statusDefinitionId: string) => string;
}

export type ConsumableEffectDefinitionById<EffectId extends ConsumableEffectId> = Extract<
  ConsumableEffectDefinition,
  { readonly effectId: EffectId }
>;

export interface ConsumableEffectExecutionResult<
  EffectId extends ConsumableEffectId = ConsumableEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;
  readonly outcome: ConsumableEffectExecutionOutcome;
  readonly state: ConsumableEffectState;
  readonly output: Output | null;
}

export interface ConsumableEffectHandler<
  EffectId extends ConsumableEffectId = ConsumableEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;
  execute(
    effect: ConsumableEffectDefinitionById<EffectId>,
    context: ConsumableEffectExecutionContext,
  ): ConsumableEffectExecutionResult<EffectId, Output>;
}
