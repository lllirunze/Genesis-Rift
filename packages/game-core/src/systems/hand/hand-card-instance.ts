import type { HandCardDefinition } from "./hand-card-definition.ts";
import { validateHandCardDefinition } from "./hand-card-definition.ts";

export interface HandCardInstance {
  readonly instanceId: string;
  readonly definitionId: string;
}

export interface CreateHandCardInstanceInput {
  readonly instanceId: string;
  readonly definition: HandCardDefinition;
}

export function createHandCardInstance(input: CreateHandCardInstanceInput): HandCardInstance {
  validateHandCardDefinition(input.definition);
  assertNonEmptyString(input.instanceId, "instanceId");

  return {
    instanceId: input.instanceId,
    definitionId: input.definition.definitionId,
  };
}

export function validateHandCardInstance(
  instance: HandCardInstance,
  definition: HandCardDefinition,
): void {
  validateHandCardDefinition(definition);
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.definitionId, "definitionId");

  if (instance.definitionId !== definition.definitionId) {
    throw new Error(`Hand card instance does not match definition: ${instance.instanceId}`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
