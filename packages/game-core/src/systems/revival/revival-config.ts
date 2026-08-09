/** 角色正式死亡后等待轮回判定的默认自身回合数。 */
export const DEFAULT_REINCARNATION_WAIT_TURNS = 3;

/** 灵魂状态在轮回判定前使用的统一阶段。 */
export const SOUL_STATUSES = ["WAITING", "READY", "REINCARNATED"] as const;

/** 单枚 D20 达到该结果时视为轮回成功。 */
export const REINCARNATION_SUCCESS_ROLL = 6;

/** 连续失败达到该次数后，下一次轮回同时投掷两枚 D20。 */
export const DOUBLE_D20_FAILURE_THRESHOLD = 3;

/** 连续失败达到该次数后，下一次轮回直接成功。 */
export const GUARANTEED_REINCARNATION_FAILURE_THRESHOLD = 5;

/** 轮回后生命资源恢复所用的整数分子。 */
export const REINCARNATION_HEALTH_RECOVERY_NUMERATOR = 50;

/** 轮回后其他资源恢复所用的整数分子。 */
export const REINCARNATION_OTHER_RESOURCE_RECOVERY_NUMERATOR = 30;

/** 轮回恢复比例统一使用的整数分母。 */
export const REINCARNATION_RECOVERY_DENOMINATOR = 100;

/** 轮回成功后保护角色免受主动敌对行为的默认自身回合数。 */
export const DEFAULT_REINCARNATION_PROTECTION_TURNS = 3;

/** 地图可提供给轮回系统的安全出生区域类型。 */
export const REINCARNATION_SAFE_SETTLEMENT_TYPES = ["TOWN", "VILLAGE", "CAMP"] as const;

/** 描述允许作为轮回安全出生点的聚落类型。 */
export type ReincarnationSafeSettlementType = (typeof REINCARNATION_SAFE_SETTLEMENT_TYPES)[number];

/** 描述灵魂当前是否可以申请轮回判定。 */
export type SoulStatus = (typeof SOUL_STATUSES)[number];
