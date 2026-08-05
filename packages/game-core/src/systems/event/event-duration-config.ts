/** 事件当前支持的持续方式。 */
export const EVENT_DURATION_TYPES = [
  /** 完成初次结算后立即结束，不保留运行时实例。 */
  "IMMEDIATE",
  /** 持续指定完整回合数后结束。 */
  "FIXED_ROUNDS",
  /** 持续至指定结束条件成立。 */
  "UNTIL_CONDITION",
  /** 持续至关联世界事件结束。 */
  "UNTIL_WORLD_EVENT_END",
  /** 在本局游戏中持续存在。 */
  "PERMANENT",
] as const;

/** 持续事件进行时间推进或结束检查的统一时机。 */
export const EVENT_DURATION_UPDATE_TIMINGS = [
  /** 事件触发玩家的回合开始阶段。 */
  "TRIGGER_PLAYER_TURN_START",
  /** 事件触发玩家的回合结束阶段。 */
  "TRIGGER_PLAYER_TURN_END",
  /** 全局回合开始阶段。 */
  "ROUND_START",
  /** 全局回合结束阶段。 */
  "ROUND_END",
] as const;

/** 相同持续事件再次生效时可以采用的处理策略。 */
export const EVENT_DURATION_REPEAT_POLICIES = [
  /** 保留已有实例并忽略新的持续效果。 */
  "IGNORE",
  /** 保留已有实例并刷新其持续时间。 */
  "REFRESH",
  /** 移除已有实例并创建新的持续效果。 */
  "REPLACE",
  /** 允许多个相同事件实例同时存在。 */
  "STACK",
] as const;
