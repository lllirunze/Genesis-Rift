import type { StatusDefinition } from "./status-definition.ts";
import { validateStatusInstance, type StatusInstance } from "./status-instance.ts";

export type StatusStackRemovalOutcome = "unchanged" | "reduced" | "removed";

export interface StatusStackRemovalResult {
  readonly instance: StatusInstance | null;
  readonly outcome: StatusStackRemovalOutcome;
  readonly previousStacks: number;
  readonly removedStacks: number;
}

export function removeStatusStacks(
  instance: StatusInstance,
  definition: StatusDefinition,
  amount: number,
): StatusStackRemovalResult {
  validateStatusInstance(instance, definition);
  assertPositiveSafeInteger(amount, "amount");

  const previousStacks = instance.currentStacks;

  if (previousStacks === 0) {
    return {
      instance,
      outcome: "unchanged",
      previousStacks,
      removedStacks: 0,
    };
  }

  const removedStacks = Math.min(previousStacks, amount);
  const currentStacks = previousStacks - removedStacks;

  if (currentStacks === 0) {
    return {
      instance: null,
      outcome: "removed",
      previousStacks,
      removedStacks,
    };
  }

  return {
    instance: {
      ...instance,
      currentStacks,
    },
    outcome: "reduced",
    previousStacks,
    removedStacks,
  };
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
