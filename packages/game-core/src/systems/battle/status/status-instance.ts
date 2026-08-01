import { validateStatusDefinition, type StatusDefinition } from "./status-definition.ts";

export interface StatusInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly currentStacks: number;
  readonly remainingTurns: number;
  readonly createdAtSequence: number;
}

export interface CreateStatusInstanceInput {
  readonly instanceId: string;
  readonly definition: StatusDefinition;
  readonly sourceId: string;
  readonly targetId: string;
  readonly createdAtSequence: number;
}

export function createStatusInstance(input: CreateStatusInstanceInput): StatusInstance {
  validateStatusDefinition(input.definition);
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.sourceId, "sourceId");
  assertNonEmptyString(input.targetId, "targetId");
  assertNonNegativeSafeInteger(input.createdAtSequence, "createdAtSequence");

  return {
    instanceId: input.instanceId,
    definitionId: input.definition.definitionId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    currentStacks: 0,
    remainingTurns: input.definition.duration.turns,
    createdAtSequence: input.createdAtSequence,
  };
}

export function validateStatusInstance(
  instance: StatusInstance,
  definition: StatusDefinition,
): void {
  validateStatusDefinition(definition);
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.definitionId, "definitionId");
  assertNonEmptyString(instance.sourceId, "sourceId");
  assertNonEmptyString(instance.targetId, "targetId");
  assertNonNegativeSafeInteger(instance.currentStacks, "currentStacks");
  assertNonNegativeSafeInteger(instance.remainingTurns, "remainingTurns");
  assertNonNegativeSafeInteger(instance.createdAtSequence, "createdAtSequence");

  if (instance.definitionId !== definition.definitionId) {
    throw new Error(
      `Status instance definition mismatch: expected ${definition.definitionId}, received ${instance.definitionId}`,
    );
  }

  if (instance.currentStacks > definition.maxStacks) {
    throw new RangeError(
      `currentStacks must not exceed the configured maximum of ${definition.maxStacks}`,
    );
  }

  if (instance.remainingTurns > definition.duration.turns) {
    throw new RangeError(
      `remainingTurns must not exceed the configured duration of ${definition.duration.turns}`,
    );
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
