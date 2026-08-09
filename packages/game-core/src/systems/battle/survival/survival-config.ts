/** V1 阶段角色进入击倒状态后的默认持续自身回合数。 */
export const DEFAULT_DOWNED_DURATION_TURNS = 3;

/** 击倒角色每个自身回合最多可以使用的普通移动力。 */
export const DOWNED_MOVEMENT_POINT_LIMIT = 1;

/** 角色在战斗与复活流程中使用的基础生存状态。 */
export const CHARACTER_SURVIVAL_STATUSES = ["ACTIVE", "DOWNED", "DEAD"] as const;
