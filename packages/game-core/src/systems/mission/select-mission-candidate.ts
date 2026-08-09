import { pickWeightedItem, type RandomStream } from "../random/index.ts";

import type { MissionType } from "./mission-config.ts";
import {
  collectMissionCandidates,
  type MissionGenerationContext,
} from "./mission-candidate-selection.ts";
import type { MissionDefinition, MissionDefinitionCatalog } from "./mission-definition.ts";

/** 描述从某一固定使命类型的候选池中随机抽取使命所需的输入。 */
export interface SelectMissionCandidateInput {
  readonly catalog: MissionDefinitionCatalog;
  readonly type: MissionType;
  readonly context: MissionGenerationContext;
  readonly randomStream: RandomStream;
  readonly excludedMissionIds?: readonly string[];
}

/**
 * 方法名：selectMissionCandidate
 * 作用：从已经通过角色与世界条件筛选的同类型使命候选池中，按基础权重选择一个使命。
 * @param input 使命注册表、固定类型、生成上下文、使命随机流与可选排除列表。
 * @returns 本次抽取到的合法静态使命定义。
 * @throws 候选池为空、排除列表非法或随机权重不合法时抛出错误。
 */
export function selectMissionCandidate(input: SelectMissionCandidateInput): MissionDefinition {
  const excludedMissionIds = input.excludedMissionIds ?? [];
  validateExcludedMissionIds(excludedMissionIds);
  const candidates = collectMissionCandidates(input.catalog, input.type, input.context).filter(
    (candidate) => !excludedMissionIds.includes(candidate.missionId),
  );

  if (candidates.length === 0) {
    throw new Error(`No eligible mission candidate for type: ${input.type}`);
  }

  return pickWeightedItem(
    input.randomStream,
    candidates.map((candidate) => ({ item: candidate, weight: candidate.baseWeight })),
  );
}

/** 校验排除列表中的使命资源标识不为空且不重复。 */
function validateExcludedMissionIds(missionIds: readonly string[]): void {
  const seen = new Set<string>();

  for (const missionId of missionIds) {
    if (typeof missionId !== "string" || missionId.trim().length === 0) {
      throw new TypeError("excludedMissionIds must contain non-empty strings");
    }

    if (seen.has(missionId)) {
      throw new Error(`excludedMissionIds cannot contain duplicates: ${missionId}`);
    }

    seen.add(missionId);
  }
}
