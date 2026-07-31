import type { PlayerId } from "@genesis-rift/shared";

export interface EquipmentInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity: 1;
  readonly stackCompatibilityKey: string;
}

export interface CreateEquipmentInstanceInput {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity?: 1;
  readonly stackCompatibilityKey?: string;
}

export function createEquipmentInstance(input: CreateEquipmentInstanceInput): EquipmentInstance {
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.definitionId, "definitionId");
  const stackCompatibilityKey = input.stackCompatibilityKey ?? "default";
  assertNonEmptyString(stackCompatibilityKey, "stackCompatibilityKey");

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    ownerPlayerId: input.ownerPlayerId,
    quantity: 1,
    stackCompatibilityKey,
  };
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
