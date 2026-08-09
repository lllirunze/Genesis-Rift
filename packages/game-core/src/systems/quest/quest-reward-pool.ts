import { assertResourceId } from "@genesis-rift/shared";

import type { RandomStream } from "../random/core/random-stream.ts";
import { pickWeightedItem } from "../random/policy/weighted-random-policy.ts";

import { QUEST_REWARD_TYPES, type QuestRewardType } from "./quest-config.ts";

/** 描述任务奖励池中的一项可执行奖励定义。 */
export interface QuestRewardDefinition {
  readonly rewardId: string;
  readonly type: QuestRewardType;
  readonly targetId: string | null;
  readonly amount: number;
}

/** 描述带权重的随机任务奖励候选。 */
export interface QuestRandomRewardCandidate {
  readonly candidateId: string;
  readonly weight: number;
  readonly reward: QuestRewardDefinition;
}

/** 描述可被任务引用的固定奖励与随机奖励资源。 */
export interface QuestRewardPoolDefinition {
  readonly rewardPoolId: string;
  readonly fixedRewards: readonly QuestRewardDefinition[];
  readonly randomRewards: readonly QuestRandomRewardCandidate[];
  readonly randomDrawCount: number;
}

/** 描述以奖励池资源 ID 索引的只读奖励池注册表。 */
export type QuestRewardPoolCatalog = Readonly<Record<string, QuestRewardPoolDefinition>>;

/**
 * 方法名：generateQuestRewards
 * 作用：按照固定奖励与加权随机候选生成一次可持久化的任务奖励结果。
 * @param pool 已校验的任务奖励池定义。
 * @param randomStream 当前对局中专用于任务奖励的随机流。
 * @returns 本次生成的不可变奖励结果，不会修改奖励池定义。
 * @throws 奖励池配置非法、随机候选不足或抽取次数不合法时抛出错误。
 */
export function generateQuestRewards(
  pool: QuestRewardPoolDefinition,
  randomStream: RandomStream,
): readonly QuestRewardDefinition[] {
  validateQuestRewardPoolDefinition(pool);

  const generatedRewards = [...pool.fixedRewards];
  const candidates = [...pool.randomRewards];

  for (let index = 0; index < pool.randomDrawCount; index += 1) {
    if (candidates.length === 0) {
      throw new Error("Quest reward pool does not contain enough random candidates");
    }

    const selected = pickWeightedItem(
      randomStream,
      candidates.map((candidate) => ({ item: candidate, weight: candidate.weight })),
    );
    generatedRewards.push(selected.reward);
    candidates.splice(candidates.indexOf(selected), 1);
  }

  return Object.freeze(generatedRewards.map((reward) => Object.freeze({ ...reward })));
}

/**
 * 方法名：validateQuestRewardPoolDefinition
 * 作用：校验奖励池标识、固定奖励、随机候选与抽取次数之间的一致性。
 * @param pool 需要校验的任务奖励池定义。
 * @returns 无返回值。
 * @throws 资源 ID、奖励定义、权重或抽取次数不满足规则时抛出错误。
 */
export function validateQuestRewardPoolDefinition(pool: QuestRewardPoolDefinition): void {
  assertResourceId(pool.rewardPoolId, "reward");
  validateRewardDefinitions(pool.fixedRewards);
  const candidateIds = new Set<string>();

  for (const candidate of pool.randomRewards) {
    assertNonEmptyString(candidate.candidateId, "candidateId");

    if (candidateIds.has(candidate.candidateId)) {
      throw new Error(`Duplicate quest reward candidate id: ${candidate.candidateId}`);
    }

    assertNonNegativeSafeInteger(candidate.weight, "candidate.weight");
    validateQuestRewardDefinition(candidate.reward);
    candidateIds.add(candidate.candidateId);
  }

  assertNonNegativeSafeInteger(pool.randomDrawCount, "randomDrawCount");

  if (pool.randomDrawCount > pool.randomRewards.length) {
    throw new RangeError("randomDrawCount cannot exceed the random reward candidate count");
  }
}

/** 验证奖励池注册表的键值一致性与全部奖励池定义。 */
export function validateQuestRewardPoolCatalog(catalog: QuestRewardPoolCatalog): void {
  for (const [rewardPoolId, pool] of Object.entries(catalog)) {
    if (rewardPoolId !== pool.rewardPoolId) {
      throw new Error(
        `Quest reward pool catalog key ${rewardPoolId} does not match its resource id`,
      );
    }

    validateQuestRewardPoolDefinition(pool);
  }
}

/** 根据奖励池 ID 读取对应静态奖励池定义。 */
export function getQuestRewardPool(
  catalog: QuestRewardPoolCatalog,
  rewardPoolId: string,
): QuestRewardPoolDefinition {
  const pool = catalog[rewardPoolId];

  if (pool === undefined) {
    throw new Error(`Unknown quest reward pool: ${rewardPoolId}`);
  }

  return pool;
}

/** 验证奖励定义集合中的奖励标识不会重复。 */
function validateRewardDefinitions(rewards: readonly QuestRewardDefinition[]): void {
  const rewardIds = new Set<string>();

  for (const reward of rewards) {
    validateQuestRewardDefinition(reward);

    if (rewardIds.has(reward.rewardId)) {
      throw new Error(`Duplicate quest reward id: ${reward.rewardId}`);
    }

    rewardIds.add(reward.rewardId);
  }
}

/**
 * 方法名：validateQuestRewardDefinition
 * 作用：校验一项任务奖励的编号、类型、目标与数量。
 * @param reward 需要校验的任务奖励定义。
 * @returns 无返回值。
 * @throws 奖励字段不满足统一规则时抛出错误。
 */
export function validateQuestRewardDefinition(reward: QuestRewardDefinition): void {
  assertNonEmptyString(reward.rewardId, "rewardId");

  if (!QUEST_REWARD_TYPES.includes(reward.type)) {
    throw new RangeError(`Unsupported quest reward type: ${reward.type}`);
  }

  if (reward.targetId !== null) {
    assertNonEmptyString(reward.targetId, "reward.targetId");
  }

  if (!Number.isSafeInteger(reward.amount) || reward.amount <= 0) {
    throw new RangeError("reward.amount must be a positive safe integer");
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
