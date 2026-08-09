/** 当前 V1 阶段支持的任务分类。 */
export const QUEST_TYPES = ["commission", "bounty", "explore", "hidden"] as const;

/** 多个任务目标之间可使用的统一完成关系。 */
export const QUEST_COMPLETION_RULES = ["ALL", "ANY"] as const;

/** 任务运行时生命周期使用的状态。 */
export const QUEST_STATUSES = [
  "AVAILABLE",
  "IN_PROGRESS",
  "COMPLETED",
  "CLAIMED",
  "ABANDONED",
  "EXPIRED",
] as const;

/** 已完成任务在领取前使用的奖励生成状态。 */
export const QUEST_REWARD_STATES = ["NOT_GENERATED", "GENERATED"] as const;

/** V1 阶段支持的通用任务目标分类。 */
export const QUEST_OBJECTIVE_TYPES = [
  "COLLECT",
  "DEFEAT",
  "EXPLORE",
  "DELIVER",
  "INVESTIGATE",
] as const;

/** V1 阶段支持的任务奖励指令分类。 */
export const QUEST_REWARD_TYPES = [
  "COIN",
  "EXPERIENCE",
  "HAND_CARD",
  "ITEM",
  "ATTRIBUTE_POINT",
  "INFORMATION",
  "SPECIAL_PERMISSION",
  "STORY",
] as const;

/** 描述当前模块支持的任务生命周期状态。 */
export type QuestStatus = (typeof QUEST_STATUSES)[number];

/** 描述已完成任务当前是否已经固化奖励结果。 */
export type QuestRewardState = (typeof QUEST_REWARD_STATES)[number];

/** 描述多个任务目标满足后的完成判定关系。 */
export type QuestCompletionRule = (typeof QUEST_COMPLETION_RULES)[number];

/** 描述当前模块支持的任务目标分类。 */
export type QuestObjectiveType = (typeof QUEST_OBJECTIVE_TYPES)[number];

/** 描述当前模块支持的任务奖励分类。 */
export type QuestRewardType = (typeof QUEST_REWARD_TYPES)[number];

/** 每名玩家同时可以持有的任务上限。 */
export const MAX_ACTIVE_QUEST_COUNT = 4;

/** 长期有效任务使用的统一有效回合数。 */
export const DEFAULT_QUEST_DURATION_TURNS = 999_999;
