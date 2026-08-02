import {
  applyStatusToCharacter,
  dispelCharacterStatus,
  type CharacterStatusState,
  type StatusApplicationOutcome,
  type StatusDefinitionCatalog,
} from "../../battle/status/index.ts";
import type { HandCardEffectExecutionContext } from "../hand-card-effect-context.ts";
import type { HandCardEffectHandler } from "../hand-card-effect-handler.ts";
import { getPlayerEffectTargetIds } from "./player-effect-targets.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusEffectHandlerDependencies {
  readonly definitions: StatusDefinitionCatalog;
  readonly getCharacterStatusState: (targetPlayerId: string) => CharacterStatusState | null;
  readonly saveCharacterStatusState: (state: CharacterStatusState) => void;
  readonly createStatusInstanceId: (
    context: HandCardEffectExecutionContext,
    targetPlayerId: string,
    statusDefinitionId: string,
  ) => string;
  readonly getCreatedAtSequence: (context: HandCardEffectExecutionContext) => number;
}

/** 描述业务操作完成后返回的结果。 */
export interface StatusAddTargetResult {
  readonly targetPlayerId: string;
  readonly state: CharacterStatusState;
  readonly statusInstanceId: string;
  readonly requestedStacks: number;
  readonly addedStacks: number;
  readonly currentStacks: number;
  readonly applicationOutcome: StatusApplicationOutcome;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusAddEffectOutput {
  readonly targets: readonly StatusAddTargetResult[];
}

/** 描述业务操作完成后返回的结果。 */
export interface StatusRemoveTargetResult {
  readonly targetPlayerId: string;
  readonly state: CharacterStatusState;
  readonly removedStatusInstanceId: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusRemoveEffectOutput {
  readonly targets: readonly StatusRemoveTargetResult[];
}

/**
 * 方法名：createStatusAddEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function createStatusAddEffectHandler(
  dependencies: StatusEffectHandlerDependencies,
): HandCardEffectHandler<"status.add", StatusAddEffectOutput> {
  return {
    effectId: "status.add",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      const targetResults: StatusAddTargetResult[] = [];

      for (const targetPlayerId of getPlayerEffectTargetIds(context)) {
        const initialState = dependencies.getCharacterStatusState(targetPlayerId);

        if (initialState === null) {
          continue;
        }

        assertStateTarget(initialState, targetPlayerId);
        const newInstanceId = dependencies.createStatusInstanceId(
          context,
          targetPlayerId,
          effect.parameters.statusDefinitionId,
        );
        const createdAtSequence = dependencies.getCreatedAtSequence(context);
        let state = initialState;
        let addedStacks = 0;
        let lastApplication: ReturnType<typeof applyStatusToCharacter> | null = null;

        for (let stack = 0; stack < effect.parameters.stacks; stack += 1) {
          lastApplication = applyStatusToCharacter(state, dependencies.definitions, {
            definitionId: effect.parameters.statusDefinitionId,
            newInstanceId,
            sourceId: context.executionId,
            createdAtSequence,
          });
          state = lastApplication.state;
          addedStacks += lastApplication.addedStacks;
        }

        if (lastApplication === null) {
          continue;
        }

        targetResults.push({
          targetPlayerId,
          state,
          statusInstanceId: lastApplication.instance.instanceId,
          requestedStacks: effect.parameters.stacks,
          addedStacks,
          currentStacks: lastApplication.instance.currentStacks,
          applicationOutcome: lastApplication.outcome,
        });
      }

      if (targetResults.length === 0) {
        return { effectId: "status.add", outcome: "skipped", output: null };
      }

      for (const targetResult of targetResults) {
        dependencies.saveCharacterStatusState(targetResult.state);
      }

      return {
        effectId: "status.add",
        outcome: "applied",
        output: { targets: targetResults },
      };
    },
  };
}

/**
 * 方法名：createStatusRemoveEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function createStatusRemoveEffectHandler(
  dependencies: StatusEffectHandlerDependencies,
): HandCardEffectHandler<"status.remove", StatusRemoveEffectOutput> {
  return {
    effectId: "status.remove",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      const targetResults: StatusRemoveTargetResult[] = [];

      for (const targetPlayerId of getPlayerEffectTargetIds(context)) {
        const state = dependencies.getCharacterStatusState(targetPlayerId);

        if (state === null) {
          continue;
        }

        assertStateTarget(state, targetPlayerId);
        const instance = state.instances.find(
          (candidate) => candidate.definitionId === effect.parameters.statusDefinitionId,
        );

        if (instance === undefined) {
          continue;
        }

        const removal = dispelCharacterStatus(state, dependencies.definitions, instance.instanceId);

        if (removal.outcome !== "dispelled") {
          continue;
        }

        targetResults.push({
          targetPlayerId,
          state: removal.state,
          removedStatusInstanceId: instance.instanceId,
        });
      }

      if (targetResults.length === 0) {
        return { effectId: "status.remove", outcome: "skipped", output: null };
      }

      for (const targetResult of targetResults) {
        dependencies.saveCharacterStatusState(targetResult.state);
      }

      return {
        effectId: "status.remove",
        outcome: "applied",
        output: { targets: targetResults },
      };
    },
  };
}

/**
 * 方法名：assertStateTarget
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @param targetPlayerId 方法所需的 targetPlayerId 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertStateTarget(state: CharacterStatusState, targetPlayerId: string): void {
  if (state.targetId !== targetPlayerId) {
    throw new Error(`character status state does not belong to target player: ${targetPlayerId}`);
  }
}
