import type { CharacterResourceState } from "../character/index.ts";
import type { RandomStream } from "../random/core/random-stream.ts";

import {
  createReincarnationProtection,
  type ReincarnationProtectionState,
} from "./reincarnation-protection.ts";
import { restoreCharacterResourcesAfterReincarnation } from "./reincarnation-recovery.ts";
import {
  selectReincarnationSpawn,
  type ReincarnationSpawnCandidate,
} from "./reincarnation-spawn.ts";
import { validateSoulState, type SoulState } from "./soul-state.ts";

/** 描述轮回成功后可以交给地图、角色与战斗系统应用的统一入场结果。 */
export interface CompleteReincarnationResult<ResourceId extends string> {
  readonly spawn: ReincarnationSpawnCandidate;
  readonly resources: CharacterResourceState<ResourceId>;
  readonly protection: ReincarnationProtectionState;
}

/**
 * 方法名：completeReincarnation
 * 作用：在轮回判定成功后选择安全出生点、恢复角色资源并创建轮回保护。
 * @param soulState 已成功通过轮回判定的灵魂状态。
 * @param resources 死亡角色保留的运行时资源状态。
 * @param healthResourceId 生命资源在运行时资源状态中的标识。
 * @param spawnCandidates 地图系统提供的安全聚落出生点候选。
 * @param randomStream 当前对局专用于轮回的独立随机流。
 * @returns 可由上层统一应用的不可变轮回入场结果。
 * @throws 灵魂尚未轮回成功、资源归属不匹配或安全出生点不可用时抛出错误。
 */
export function completeReincarnation<ResourceId extends string>(
  soulState: SoulState,
  resources: CharacterResourceState<ResourceId>,
  healthResourceId: ResourceId,
  spawnCandidates: readonly ReincarnationSpawnCandidate[],
  randomStream: RandomStream,
): CompleteReincarnationResult<ResourceId> {
  validateSoulState(soulState);

  if (soulState.status !== "REINCARNATED") {
    throw new Error("Only reincarnated souls can complete world entry");
  }

  if (resources.playerId !== soulState.participantId) {
    throw new Error("Reincarnation resources must belong to the reincarnated participant");
  }

  const spawn = selectReincarnationSpawn(spawnCandidates, randomStream);
  const restoredResources = restoreCharacterResourcesAfterReincarnation(
    resources,
    healthResourceId,
  );
  const protection = createReincarnationProtection(soulState.participantId);

  return Object.freeze({ spawn, resources: restoredResources, protection });
}
