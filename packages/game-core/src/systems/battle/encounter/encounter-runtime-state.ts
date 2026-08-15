import type { TileId } from "@genesis-rift/shared";

import type { EncounterDefinition } from "./encounter-definition.ts";

/** 描述当前局内一个可被攻击或已经击败的敌对遭遇实例。 */
export interface EncounterRuntimeState {
  readonly instanceId: string;
  readonly encounterDefinitionId: string;
  readonly triggeringPlayerId: string;
  readonly tileId: TileId;
  readonly currentHealth: number;
  readonly currentShield: number;
  readonly status: "ACTIVE" | "DEFEATED";
}

/** 根据静态定义创建位于触发地块的初始敌对遭遇实例。 */
export function createEncounterRuntimeState(
  instanceId: string,
  definition: EncounterDefinition,
  triggeringPlayerId: string,
  tileId: TileId,
): EncounterRuntimeState {
  if (instanceId.trim().length === 0 || triggeringPlayerId.trim().length === 0) {
    throw new TypeError("Encounter instance and triggering player ids must not be empty");
  }

  return Object.freeze({
    instanceId,
    encounterDefinitionId: definition.encounterDefinitionId,
    triggeringPlayerId,
    tileId,
    currentHealth: definition.maximumHealth,
    currentShield: 0,
    status: "ACTIVE",
  });
}
