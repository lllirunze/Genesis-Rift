import type { StatusDefinition } from "./status-definition.ts";
import { validateStatusInstance, type StatusInstance } from "./status-instance.ts";

export type StatusDurationAdvanceOutcome = "unchanged" | "ticked" | "expired";

export interface StatusDurationAdvanceResult {
  readonly instance: StatusInstance | null;
  readonly outcome: StatusDurationAdvanceOutcome;
  readonly previousRemainingTurns: number;
}

export function advanceStatusDurationAtTurnEnd(
  instance: StatusInstance,
  definition: StatusDefinition,
  turnOwnerId: string,
): StatusDurationAdvanceResult {
  validateStatusInstance(instance, definition);

  if (instance.currentStacks === 0 || instance.targetId !== turnOwnerId) {
    return {
      instance,
      outcome: "unchanged",
      previousRemainingTurns: instance.remainingTurns,
    };
  }

  if (instance.remainingTurns <= 1) {
    return {
      instance: null,
      outcome: "expired",
      previousRemainingTurns: instance.remainingTurns,
    };
  }

  return {
    instance: {
      ...instance,
      remainingTurns: instance.remainingTurns - 1,
    },
    outcome: "ticked",
    previousRemainingTurns: instance.remainingTurns,
  };
}
