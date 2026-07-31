import type { PlayerId } from "@genesis-rift/shared";

import type { ItemDefinition } from "./item-definition.ts";

export interface ItemInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity: number;
  readonly stackCompatibilityKey: string;
}

export interface CreateItemInstanceInput {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity?: number;
  readonly stackCompatibilityKey?: string;
}

export function createItemInstance(
  input: CreateItemInstanceInput,
  definition: ItemDefinition,
): ItemInstance {
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.definitionId, "definitionId");

  if (input.definitionId !== definition.definitionId) {
    throw new Error(`Item ${input.instanceId} does not match its definition`);
  }

  const quantity = input.quantity ?? 1;
  const stackCompatibilityKey = input.stackCompatibilityKey ?? "default";

  assertNonEmptyString(stackCompatibilityKey, "stackCompatibilityKey");
  validateItemQuantity(quantity, definition);

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    ownerPlayerId: input.ownerPlayerId,
    quantity,
    stackCompatibilityKey,
  };
}

export function validateItemInstance(instance: ItemInstance, definition: ItemDefinition): void {
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.definitionId, "definitionId");
  assertNonEmptyString(instance.stackCompatibilityKey, "stackCompatibilityKey");

  if (instance.definitionId !== definition.definitionId) {
    throw new Error(`Item ${instance.instanceId} does not match its definition`);
  }

  validateItemQuantity(instance.quantity, definition);
}

export function areItemStacksCompatible(first: ItemInstance, second: ItemInstance): boolean {
  return (
    first.definitionId === second.definitionId &&
    first.ownerPlayerId === second.ownerPlayerId &&
    first.stackCompatibilityKey === second.stackCompatibilityKey
  );
}

function validateItemQuantity(quantity: number, definition: ItemDefinition): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError("quantity must be a positive safe integer");
  }

  if (quantity > definition.maximumStack) {
    throw new RangeError(
      `quantity must not exceed maximumStack ${definition.maximumStack}, received ${quantity}`,
    );
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
