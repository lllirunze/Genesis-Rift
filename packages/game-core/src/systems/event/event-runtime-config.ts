/** 事件实例从抽取到终止所使用的运行时状态。 */
export const EVENT_INSTANCE_STATUSES = [
  /** 事件已经抽取，但尚未向玩家公开内容。 */
  "PENDING_REVEAL",
  /** 事件已经公开，可以进入选项与结算流程。 */
  "REVEALED",
  /** 玩家主动放弃可选择揭露事件，事件不再产生效果。 */
  "DECLINED",
] as const;

/** 可选择揭露事件在待揭露阶段允许执行的操作。 */
export const EVENT_REVEAL_ACTIONS = [
  /** 公开事件内容并继续后续流程。 */
  "REVEAL",
  /** 放弃未知事件且不产生任何效果。 */
  "DECLINE",
] as const;

/** 描述可选择揭露事件允许触发玩家执行的操作。 */
export type EventRevealAction = (typeof EVENT_REVEAL_ACTIONS)[number];
