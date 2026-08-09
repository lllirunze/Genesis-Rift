import type { RandomStream } from "../random/core/random-stream.ts";

import {
  REINCARNATION_SAFE_SETTLEMENT_TYPES,
  type ReincarnationSafeSettlementType,
} from "./revival-config.ts";

/** 描述地图系统筛选完成后提供的一个可用轮回出生点。 */
export interface ReincarnationSpawnCandidate {
  readonly spawnId: string;
  readonly settlementType: ReincarnationSafeSettlementType;
}

/**
 * 方法名：selectReincarnationSpawn
 * 作用：从地图已确认安全的城镇、村庄或营地候选中随机选择一个轮回出生点。
 * @param candidates 当前世界中由地图系统提供的可用安全出生点集合。
 * @param randomStream 当前对局专用于轮回的独立随机流。
 * @returns 被选中的不可变安全出生点。
 * @throws 候选集合为空、候选标识重复或区域类型不支持时抛出错误。
 */
export function selectReincarnationSpawn(
  candidates: readonly ReincarnationSpawnCandidate[],
  randomStream: RandomStream,
): ReincarnationSpawnCandidate {
  validateReincarnationSpawnCandidates(candidates);
  return candidates[randomStream.nextInt(0, candidates.length)]!;
}

/**
 * 方法名：validateReincarnationSpawnCandidates
 * 作用：校验地图提供的安全出生点均拥有唯一标识与支持的聚落类型。
 * @param candidates 需要校验的安全出生点集合。
 * @returns 无返回值。
 * @throws 候选集合为空、候选标识重复或区域类型不支持时抛出错误。
 */
export function validateReincarnationSpawnCandidates(
  candidates: readonly ReincarnationSpawnCandidate[],
): void {
  if (candidates.length === 0) {
    throw new Error("Reincarnation requires at least one safe spawn candidate");
  }

  const spawnIds = new Set<string>();

  for (const candidate of candidates) {
    assertNonEmptyString(candidate.spawnId, "spawnId");

    if (spawnIds.has(candidate.spawnId)) {
      throw new Error(`Duplicate reincarnation spawn id: ${candidate.spawnId}`);
    }

    if (!REINCARNATION_SAFE_SETTLEMENT_TYPES.includes(candidate.settlementType)) {
      throw new RangeError(
        `Unsupported reincarnation settlement type: ${candidate.settlementType}`,
      );
    }

    spawnIds.add(candidate.spawnId);
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
