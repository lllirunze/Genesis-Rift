import { pickWeightedItem, type RandomStream } from "../random/index.ts";

import { MISSION_REPLACEMENT_REASONS, type MissionReplacementReason } from "./mission-config.ts";
import {
  collectMissionCandidates,
  type MissionGenerationContext,
} from "./mission-candidate-selection.ts";
import type { MissionDefinition, MissionDefinitionCatalog } from "./mission-definition.ts";
import { replaceInfeasibleMission, type PlayerMissionState } from "./player-mission-state.ts";

/** 描述自动替换客观不可完成使命时所需的状态、上下文与随机流。 */
export interface ReplaceInfeasibleMissionAutomaticallyInput {
  readonly state: PlayerMissionState;
  readonly catalog: MissionDefinitionCatalog;
  readonly context: MissionGenerationContext;
  readonly randomStream: RandomStream;
  readonly missionId: string;
  readonly reason: Exclude<MissionReplacementReason, "PLAYER_REFORGE">;
  readonly currentTurn: number;
}

/** 描述自动使命替换完成后保留的新状态与替换资源标识。 */
export interface ReplacedInfeasibleMissionResult {
  readonly state: PlayerMissionState;
  readonly previousMissionId: string;
  readonly replacementMissionId: string;
}

/**
 * 方法名：replaceInfeasibleMissionAutomatically
 * 作用：在世界变化或身份变化导致使命不可达时，自动抽取同类型、同替换分组且未出现过的新使命。
 * @param input 当前使命状态、候选上下文、随机流、不可达使命与客观替换原因。
 * @returns 已替换使命的不可变状态与旧、新使命资源标识。
 * @throws 使命不存在、已完成、替换原因非法或没有合法替代使命时抛出错误。
 */
export function replaceInfeasibleMissionAutomatically(
  input: ReplaceInfeasibleMissionAutomaticallyInput,
): ReplacedInfeasibleMissionResult {
  if (!MISSION_REPLACEMENT_REASONS.includes(input.reason)) {
    throw new RangeError(`Unsupported mission replacement reason: ${input.reason}`);
  }

  const previous = input.state.missions.find((mission) => mission.missionId === input.missionId);
  if (previous === undefined) {
    throw new Error(`Player does not hold mission: ${input.missionId}`);
  }
  if (previous.completedAtTurn !== null) {
    throw new Error("Completed missions cannot be replaced");
  }

  const previousDefinition = input.catalog[input.missionId];
  if (previousDefinition === undefined) {
    throw new Error(`Unknown mission definition: ${input.missionId}`);
  }

  const excludedMissionIds = new Set([
    ...input.state.missions.map((mission) => mission.missionId),
    ...input.state.replacementHistory.flatMap((entry) => [
      entry.previousMissionId,
      entry.replacementMissionId,
    ]),
  ]);
  const candidates = collectMissionCandidates(
    input.catalog,
    previousDefinition.type,
    input.context,
  ).filter(
    (candidate) =>
      !excludedMissionIds.has(candidate.missionId) &&
      candidate.replacementGroupId === previousDefinition.replacementGroupId &&
      isCompatibleWithHeldMissions(candidate, input.state, input.catalog, input.missionId),
  );

  if (candidates.length === 0) {
    throw new Error(`No eligible automatic replacement for mission: ${input.missionId}`);
  }

  const replacement = pickWeightedItem(
    input.randomStream,
    candidates.map((candidate) => ({ item: candidate, weight: candidate.baseWeight })),
  );
  const state = replaceInfeasibleMission(
    input.state,
    input.catalog,
    input.missionId,
    replacement.missionId,
    input.reason,
    input.currentTurn,
  );

  return Object.freeze({
    state,
    previousMissionId: input.missionId,
    replacementMissionId: replacement.missionId,
  });
}

/** 判断候选使命不会与其余四项当前使命产生冲突标签。 */
function isCompatibleWithHeldMissions(
  candidate: MissionDefinition,
  state: PlayerMissionState,
  catalog: MissionDefinitionCatalog,
  previousMissionId: string,
): boolean {
  return state.missions
    .filter((mission) => mission.missionId !== previousMissionId)
    .map((mission) => catalog[mission.missionId]!)
    .every(
      (held) =>
        !candidate.conflictTags.some((tag) => held.conflictTags.includes(tag)) &&
        !(
          candidate.progressKey === held.progressKey &&
          candidate.gameplayTags.length === held.gameplayTags.length &&
          candidate.gameplayTags.every((tag) => held.gameplayTags.includes(tag))
        ),
    );
}
