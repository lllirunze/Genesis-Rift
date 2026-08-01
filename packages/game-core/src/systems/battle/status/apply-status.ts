import type { StatusDefinition } from "./status-definition.ts";
import { validateStatusInstance, type StatusInstance } from "./status-instance.ts";

export type StatusApplicationOutcome = "applied" | "stacked" | "refreshed";

export interface StatusApplicationResult {
  readonly instance: StatusInstance;
  readonly outcome: StatusApplicationOutcome;
  readonly previousStacks: number;
  readonly addedStacks: 0 | 1;
}

export function applyStatus(
  instance: StatusInstance,
  definition: StatusDefinition,
): StatusApplicationResult {
  validateStatusInstance(instance, definition);

  const previousStacks = instance.currentStacks;
  const currentStacks = Math.min(previousStacks + 1, definition.maxStacks);
  const addedStacks: 0 | 1 = currentStacks > previousStacks ? 1 : 0;

  return {
    instance: {
      ...instance,
      currentStacks,
      remainingTurns: definition.duration.turns,
    },
    outcome: getApplicationOutcome(previousStacks, addedStacks),
    previousStacks,
    addedStacks,
  };
}

function getApplicationOutcome(
  previousStacks: number,
  addedStacks: 0 | 1,
): StatusApplicationOutcome {
  if (previousStacks === 0) {
    return "applied";
  }

  if (addedStacks === 1) {
    return "stacked";
  }

  return "refreshed";
}
