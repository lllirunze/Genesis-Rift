import type { PlayerId } from "@genesis-rift/shared";

export interface EquipmentInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
}

export function createEquipmentInstance(input: EquipmentInstance): EquipmentInstance {
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.definitionId, "definitionId");

  return { ...input };
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
