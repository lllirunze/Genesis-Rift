import type { PlayerId } from "@genesis-rift/shared";

import { MAX_MISSION_REFORGE_USES } from "./mission-config.ts";

/** 描述单名玩家本局主动使命重塑的私有次数与移除记录。 */
export interface MissionReforgeState {
  readonly ownerId: PlayerId;
  readonly usedCount: number;
  readonly lastUsedTurn: number | null;
  readonly removedMissionIds: readonly string[];
}

/** 创建一名玩家尚未使用主动使命重塑的初始状态。 */
export function createMissionReforgeState(ownerId: PlayerId): MissionReforgeState {
  assertNonEmptyString(ownerId, "ownerId");
  return Object.freeze({
    ownerId,
    usedCount: 0,
    lastUsedTurn: null,
    removedMissionIds: Object.freeze([]),
  });
}

/** 校验使命重塑次数、回合记录与已移除使命集合。 */
export function validateMissionReforgeState(state: MissionReforgeState): void {
  assertNonEmptyString(state.ownerId, "ownerId");

  if (
    !Number.isSafeInteger(state.usedCount) ||
    state.usedCount < 0 ||
    state.usedCount > MAX_MISSION_REFORGE_USES
  ) {
    throw new RangeError(`usedCount must be between 0 and ${MAX_MISSION_REFORGE_USES}`);
  }

  if (
    state.lastUsedTurn !== null &&
    (!Number.isSafeInteger(state.lastUsedTurn) || state.lastUsedTurn < 0)
  ) {
    throw new RangeError("lastUsedTurn must be null or a non-negative safe integer");
  }

  const ids = new Set<string>();
  for (const missionId of state.removedMissionIds) {
    assertNonEmptyString(missionId, "removedMissionIds");
    if (ids.has(missionId)) {
      throw new Error(`removedMissionIds cannot contain duplicates: ${missionId}`);
    }
    ids.add(missionId);
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
