import type { PlayerId } from "@genesis-rift/shared";

import { pickWeightedItem, type RandomStream } from "../random/index.ts";

import {
  MAX_MISSION_GENERATION_ATTEMPTS,
  MIN_MISSION_GAMEPLAY_TAG_COVERAGE,
  MISSION_TYPES,
  type MissionType,
} from "./mission-config.ts";
import {
  collectMissionCandidates,
  isMissionEligible,
  type MissionGenerationContext,
} from "./mission-candidate-selection.ts";
import {
  getMissionDefinition,
  type MissionDefinition,
  type MissionDefinitionCatalog,
} from "./mission-definition.ts";
import { createPlayerMissionState, type PlayerMissionState } from "./player-mission-state.ts";

/** 描述各使命类型在一般候选池不足时使用的同类型保底使命资源。 */
export type MissionFallbackCatalog = Readonly<Partial<Record<MissionType, string>>>;

/** 描述生成一组玩家使命所需的静态资源、世界上下文与随机流。 */
export interface GenerateMissionSetInput {
  readonly catalog: MissionDefinitionCatalog;
  readonly context: MissionGenerationContext;
  readonly randomStream: RandomStream;
  readonly fallbackMissionIds?: MissionFallbackCatalog;
  readonly excludedMissionIds?: readonly string[];
}

/** 描述完成组合检查后生成的五项不同类型使命。 */
export interface GeneratedMissionSet {
  readonly missions: readonly MissionDefinition[];
  readonly generationAttemptCount: number;
}

/** 描述为单名玩家生成并私下发放使命所需的输入。 */
export interface GeneratePlayerMissionStateInput extends GenerateMissionSetInput {
  readonly ownerId: PlayerId;
}

/**
 * 方法名：generateMissionSet
 * 作用：按五类固定使命类型生成一组合法使命，并检查重复、冲突标签与玩法覆盖。
 * @param input 静态使命定义、角色世界上下文、使命随机流、可选保底使命和排除列表。
 * @returns 已通过组合检查的五项使命和本次成功使用的尝试次数。
 * @throws 合法候选不足、保底使命非法或超过最大生成次数时抛出错误。
 */
export function generateMissionSet(input: GenerateMissionSetInput): GeneratedMissionSet {
  const excludedMissionIds = input.excludedMissionIds ?? [];
  validateUniqueNonEmptyStrings(excludedMissionIds, "excludedMissionIds");

  for (let attempt = 1; attempt <= MAX_MISSION_GENERATION_ATTEMPTS; attempt += 1) {
    const missions: MissionDefinition[] = [];

    for (const type of MISSION_TYPES) {
      const selected = selectCompatibleMission(
        input.catalog,
        type,
        input.context,
        input.randomStream,
        [...excludedMissionIds, ...missions.map((mission) => mission.missionId)],
        missions,
        input.fallbackMissionIds,
      );

      missions.push(selected);
    }

    if (hasRequiredGameplayCoverage(missions)) {
      return Object.freeze({
        missions: Object.freeze(missions),
        generationAttemptCount: attempt,
      });
    }
  }

  throw new Error(
    `Unable to generate a mission set with ${MIN_MISSION_GAMEPLAY_TAG_COVERAGE} gameplay tags`,
  );
}

/**
 * 方法名：generatePlayerMissionState
 * 作用：生成通过组合检查的五项使命，并立即构建玩家私有的初始使命运行时状态。
 * @param input 生成上下文、静态资源、使命随机流与使命所属玩家标识。
 * @returns 玩家私有使命状态及对应的生成记录。
 * @throws 使命候选不足、组合不合法或玩家标识非法时抛出错误。
 */
export function generatePlayerMissionState(input: GeneratePlayerMissionStateInput): {
  readonly state: PlayerMissionState;
  readonly generatedSet: GeneratedMissionSet;
} {
  const generatedSet = generateMissionSet(input);

  return Object.freeze({
    state: createPlayerMissionState(
      input.ownerId,
      generatedSet.missions.map((mission) => mission.missionId),
      input.catalog,
    ),
    generatedSet,
  });
}

/** 在一种固定使命类型中选择与当前组合兼容的候选，必要时使用保底资源。 */
function selectCompatibleMission(
  catalog: MissionDefinitionCatalog,
  type: MissionType,
  context: MissionGenerationContext,
  randomStream: RandomStream,
  excludedMissionIds: readonly string[],
  selectedMissions: readonly MissionDefinition[],
  fallbackMissionIds: MissionFallbackCatalog | undefined,
): MissionDefinition {
  const candidates = collectMissionCandidates(catalog, type, context).filter(
    (candidate) =>
      !excludedMissionIds.includes(candidate.missionId) &&
      isMissionCompatible(candidate, selectedMissions),
  );

  if (candidates.length > 0) {
    return pickWeightedItem(
      randomStream,
      candidates.map((candidate) => ({ item: candidate, weight: candidate.baseWeight })),
    );
  }

  const fallbackMissionId = fallbackMissionIds?.[type];

  if (fallbackMissionId === undefined) {
    throw new Error(`No compatible mission candidate or fallback for type: ${type}`);
  }

  const fallback = getMissionDefinition(catalog, fallbackMissionId);

  if (
    fallback.type !== type ||
    excludedMissionIds.includes(fallback.missionId) ||
    !isMissionEligible(fallback, context) ||
    !isMissionCompatible(fallback, selectedMissions)
  ) {
    throw new Error(`Invalid fallback mission for type: ${type}`);
  }

  return fallback;
}

/** 判断候选使命是否与当前已经选中的使命发生冲突标签重叠。 */
function isMissionCompatible(
  candidate: MissionDefinition,
  selectedMissions: readonly MissionDefinition[],
): boolean {
  return selectedMissions.every(
    (selected) =>
      !candidate.conflictTags.some((tag) => selected.conflictTags.includes(tag)) &&
      !hasEquivalentProgressObjective(candidate, selected),
  );
}

/** 判断两项使命是否具有完全相同的进度口径与玩法标签，避免生成重复目标。 */
function hasEquivalentProgressObjective(
  first: MissionDefinition,
  second: MissionDefinition,
): boolean {
  if (
    first.progressKey !== second.progressKey ||
    first.gameplayTags.length !== second.gameplayTags.length
  ) {
    return false;
  }

  return first.gameplayTags.every((tag) => second.gameplayTags.includes(tag));
}

/** 判断五项使命合计是否至少覆盖配置要求数量的不同玩法标签。 */
function hasRequiredGameplayCoverage(missions: readonly MissionDefinition[]): boolean {
  const gameplayTags = new Set(missions.flatMap((mission) => mission.gameplayTags));
  return gameplayTags.size >= MIN_MISSION_GAMEPLAY_TAG_COVERAGE;
}

/** 校验字符串数组中的元素均不为空且不重复。 */
function validateUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`${field} must contain non-empty strings`);
    }

    if (seen.has(value)) {
      throw new Error(`${field} cannot contain duplicate values: ${value}`);
    }

    seen.add(value);
  }
}
