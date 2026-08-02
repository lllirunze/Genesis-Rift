import type { CharacterStatusState } from "../battle/status/index.ts";
import type { CharacterResourceState } from "../character/index.ts";
import type {
  ConsumableEffectDefinition,
  ConsumableEffectExecutionOutcome,
  ConsumableEffectId,
} from "./consumable-definition.ts";

/** 描述业务对象在运行时保存的状态。 */
export interface ConsumableEffectState {
  readonly resourceState: CharacterResourceState<string>;
  readonly statusState: CharacterStatusState;
}

/** 描述一次业务结算所需的上下文与外部依赖。 */
export interface ConsumableEffectExecutionContext {
  readonly playerId: string;
  readonly itemDefinitionId: string;
  readonly effectIndex: number;
  readonly state: ConsumableEffectState;
  readonly createdAtSequence: number;
  readonly createStatusInstanceId: (effectIndex: number, statusDefinitionId: string) => string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type ConsumableEffectDefinitionById<EffectId extends ConsumableEffectId> = Extract<
  ConsumableEffectDefinition,
  { readonly effectId: EffectId }
>;

/** 描述业务操作完成后返回的结果。 */
export interface ConsumableEffectExecutionResult<
  EffectId extends ConsumableEffectId = ConsumableEffectId,
  Output = unknown,
> {
  readonly effectId: EffectId;
  readonly outcome: ConsumableEffectExecutionOutcome;
  readonly state: ConsumableEffectState;
  readonly output: Output | null;
}

/** 描述当前模块对外公开的业务数据契约。 */
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
