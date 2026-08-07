/** 事件实例从抽取到终止所使用的运行时状态。 */
export const EVENT_INSTANCE_STATUSES = [
  /** 事件已经抽取，但尚未向玩家公开内容。 */
  "PENDING_REVEAL",
  /** 事件已经公开，可以进入选项与结算流程。 */
  "REVEALED",
  /** 事件已经确定直接效果或玩家选项，正在执行效果序列。 */
  "RESOLVING",
  /** 事件效果序列已经执行完成。 */
  "RESOLVED",
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

/** 事件运行时状态允许发生的单向迁移关系。 */
export const EVENT_INSTANCE_ALLOWED_TRANSITIONS = {
  PENDING_REVEAL: ["REVEALED", "DECLINED"],
  REVEALED: ["RESOLVING"],
  RESOLVING: ["RESOLVED"],
  RESOLVED: [],
  DECLINED: [],
} as const satisfies Readonly<
  Record<
    (typeof EVENT_INSTANCE_STATUSES)[number],
    readonly (typeof EVENT_INSTANCE_STATUSES)[number][]
  >
>;

/** 事件效果处理器可以返回的标准执行结果。 */
export const EVENT_EFFECT_EXECUTION_OUTCOMES = [
  /** 当前处理器已经执行对应业务效果。 */
  "APPLIED",
  /** 当前效果需要交由尚未接入的外部业务系统继续处理。 */
  "DEFERRED",
  /** 当前效果执行失败，但配置允许继续执行后续效果。 */
  "FAILED",
] as const;
