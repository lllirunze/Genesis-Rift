import type { CharacterResourceState } from "../character/index.ts";
import type { RandomStream } from "../random/core/random-stream.ts";

import {
  createReincarnationProtection,
  type ReincarnationProtectionState,
} from "./reincarnation-protection.ts";
import {
  selectReincarnationSpawn,
  type ReincarnationSpawnCandidate,
} from "./reincarnation-spawn.ts";
import { validateSoulState, type SoulState } from "./soul-state.ts";

/** 描述中途加入成功后等待下一轮正常行动的统一入场结果。 */
export interface CompleteMidGameJoinResult<ResourceId extends string> {
  readonly spawn: ReincarnationSpawnCandidate;
  readonly resources: CharacterResourceState<ResourceId>;
  readonly protection: ReincarnationProtectionState;
  readonly joinsAtNextRound: true;
}

/**
 * 方法名：completeMidGameJoin
 * 作用：为中途加入成功的新角色选择安全出生点并添加轮回保护，保留其正常初始资源。
 * @param soulState 已通过加入 D20 判定的中途加入灵魂状态。
 * @param resources 新角色创建完成后的正常初始资源状态。
 * @param spawnCandidates 地图系统提供的安全聚落出生点候选。
 * @param randomStream 当前对局专用于轮回与加入的独立随机流。
 * @returns 标记为下一轮加入行动顺序的不可变入场结果。
 * @throws 灵魂尚未判定成功、资源归属不匹配或安全出生点不可用时抛出错误。
 */
export function completeMidGameJoin<ResourceId extends string>(
  soulState: SoulState,
  resources: CharacterResourceState<ResourceId>,
  spawnCandidates: readonly ReincarnationSpawnCandidate[],
  randomStream: RandomStream,
): CompleteMidGameJoinResult<ResourceId> {
  validateSoulState(soulState);

  if (soulState.status !== "REINCARNATED") {
    throw new Error("Only reincarnated join souls can enter the world");
  }

  if (resources.playerId !== soulState.participantId) {
    throw new Error("Mid-game join resources must belong to the joining participant");
  }

  return Object.freeze({
    spawn: selectReincarnationSpawn(spawnCandidates, randomStream),
    resources,
    protection: createReincarnationProtection(soulState.participantId),
    joinsAtNextRound: true,
  });
}
