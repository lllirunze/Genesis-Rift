import { increaseCharacterResource, type CharacterResourceState } from "../../character/index.ts";
import type { HandCardEffectHandler } from "../hand-card-effect-handler.ts";
import { getPlayerEffectTargetIds } from "./player-effect-targets.ts";

export interface HealthRestoreEffectHandlerDependencies {
  readonly healthResourceId: string;
  readonly getCharacterResourceState: (
    targetPlayerId: string,
  ) => CharacterResourceState<string> | null;
  readonly saveCharacterResourceState: (state: CharacterResourceState<string>) => void;
}

export interface HealthRestoreTargetResult {
  readonly targetPlayerId: string;
  readonly state: CharacterResourceState<string>;
  readonly requestedAmount: number;
  readonly restoredAmount: number;
}

export interface HealthRestoreEffectOutput {
  readonly targets: readonly HealthRestoreTargetResult[];
}

export function createHealthRestoreEffectHandler(
  dependencies: HealthRestoreEffectHandlerDependencies,
): HandCardEffectHandler<"health.restore", HealthRestoreEffectOutput> {
  assertNonEmptyString(dependencies.healthResourceId, "healthResourceId");

  return {
    effectId: "health.restore",
    execute(effect, context) {
      const targetResults: HealthRestoreTargetResult[] = [];

      for (const targetPlayerId of getPlayerEffectTargetIds(context)) {
        const state = dependencies.getCharacterResourceState(targetPlayerId);

        if (state === null) {
          continue;
        }

        assertStateOwner(state.playerId, targetPlayerId, "character resource");
        const change = increaseCharacterResource(
          state,
          dependencies.healthResourceId,
          effect.parameters.amount,
        );

        if (change.appliedAmount === 0) {
          continue;
        }

        targetResults.push({
          targetPlayerId,
          state: change.state,
          requestedAmount: change.requestedAmount,
          restoredAmount: change.appliedAmount,
        });
      }

      if (targetResults.length === 0) {
        return {
          effectId: "health.restore",
          outcome: "skipped",
          output: null,
        };
      }

      for (const targetResult of targetResults) {
        dependencies.saveCharacterResourceState(targetResult.state);
      }

      return {
        effectId: "health.restore",
        outcome: "applied",
        output: { targets: targetResults },
      };
    },
  };
}

function assertStateOwner(actualPlayerId: string, targetPlayerId: string, stateName: string): void {
  if (actualPlayerId !== targetPlayerId) {
    throw new Error(`${stateName} state does not belong to target player: ${targetPlayerId}`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
