/** 每名玩家在一局游戏中固定持有的使命数量。 */
export const MISSION_COUNT_PER_PLAYER = 5;

/** 达成默认个人胜利条件所需完成的使命数量。 */
export const MISSION_COMPLETION_COUNT_FOR_VICTORY = 3;

/** 当前版本使命系统支持的五类固定来源。 */
export const MISSION_TYPES = ["identity", "faith", "growth", "world", "free"] as const;

/** 使命运行时使用的胜利确认阶段。 */
export const MISSION_VICTORY_STATUSES = ["NONE", "PENDING_CONFIRMATION", "CONFIRMED"] as const;

/** 系统自动将客观不可完成使命替换为同类型使命时的原因。 */
export const MISSION_REPLACEMENT_REASONS = [
  "WORLD_INVALIDATED",
  "IDENTITY_CHANGED",
  "PLAYER_REFORGE",
] as const;

/** 使命生成与组合平衡使用的统一难度等级。 */
export const MISSION_DIFFICULTIES = ["basic", "standard", "challenge"] as const;

/** 一次使命组合生成允许尝试的最大次数，避免配置异常导致无限随机。 */
export const MAX_MISSION_GENERATION_ATTEMPTS = 20;

/** 五项使命组合至少应覆盖的主要玩法标签数量。 */
export const MIN_MISSION_GAMEPLAY_TAG_COVERAGE = 3;

/** 每位玩家一局游戏最多可成功执行的主动使命重塑次数。 */
export const MAX_MISSION_REFORGE_USES = 2;

/** 按已成功重塑次数索引的元宝费用；后一次重塑费用更高。 */
export const MISSION_REFORGE_COIN_COSTS = [10, 20] as const;

/** 使命重塑支付元宝时使用的固定经济原因标识。 */
export const MISSION_REFORGE_COIN_REASON_ID = "mission.reforge";

/** 描述使命所属的固定玩法来源类别。 */
export type MissionType = (typeof MISSION_TYPES)[number];

/** 描述使命当前是否等待或已经完成胜利确认。 */
export type MissionVictoryStatus = (typeof MISSION_VICTORY_STATUSES)[number];

/** 描述使命自动替换发生的客观业务原因。 */
export type MissionReplacementReason = (typeof MISSION_REPLACEMENT_REASONS)[number];

/** 描述使命资源在生成阶段使用的难度等级。 */
export type MissionDifficulty = (typeof MISSION_DIFFICULTIES)[number];
