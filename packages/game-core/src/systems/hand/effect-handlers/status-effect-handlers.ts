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

export interface StatusAddTargetResult {
  readonly targetPlayerId: string;
  readonly state: CharacterStatusState;
  readonly statusInstanceId: string;
  readonly requestedStacks: number;
  readonly addedStacks: number;
  readonly currentStacks: number;
  readonly applicationOutcome: StatusApplicationOutcome;
}

export interface StatusAddEffectOutput {
  readonly targets: readonly StatusAddTargetResult[];
}

export interface StatusRemoveTargetResult {
  readonly targetPlayerId: string;
  readonly state: CharacterStatusState;
  readonly removedStatusInstanceId: string;
}

export interface StatusRemoveEffectOutput {
  readonly targets: readonly StatusRemoveTargetResult[];
}

export function createStatusAddEffectHandler(
  dependencies: StatusEffectHandlerDependencies,
): HandCardEffectHandler<"status.add", StatusAddEffectOutput> {
  return {
    effectId: "status.add",
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

export function createStatusRemoveEffectHandler(
  dependencies: StatusEffectHandlerDependencies,
): HandCardEffectHandler<"status.remove", StatusRemoveEffectOutput> {
  return {
    effectId: "status.remove",
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

function assertStateTarget(state: CharacterStatusState, targetPlayerId: string): void {
  if (state.targetId !== targetPlayerId) {
    throw new Error(`character status state does not belong to target player: ${targetPlayerId}`);
  }
}
