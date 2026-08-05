/** 事件定义当前可以引用的标准效果处理器标识。 */
export const EVENT_EFFECT_IDS = [
  /** 修改角色当前生命、灵力等运行时资源。 */
  "characterResource.modify",
  /** 增加或扣除背包中的元宝数量。 */
  "coin.modify",
  /** 向角色发放指定物品。 */
  "item.obtain",
  /** 从指定物品池中随机抽取并发放物品。 */
  "item.obtainFromPool",
  /** 向角色添加指定状态。 */
  "status.add",
  /** 创建指定遭遇并进入战斗。 */
  "battle.start",
  /** 将天气切换为指定天气。 */
  "weather.change",
  /** 将角色传送至指定地图地块。 */
  "movement.teleport",
] as const;

/** 标准事件效果当前支持的运行时目标类别。 */
export const EVENT_EFFECT_TARGET_TYPES = [
  /** 本次事件的触发玩家。 */
  "TRIGGER_PLAYER",
  /** 当前对局中的全部玩家。 */
  "ALL_PLAYERS",
  /** 本次事件所在区域。 */
  "CURRENT_REGION",
  /** 当前游戏世界。 */
  "WORLD",
] as const;

/** 各标准事件效果允许使用的目标类别。 */
export const EVENT_EFFECT_ALLOWED_TARGET_TYPES = {
  /** 角色资源只能作用于触发玩家或全部玩家。 */
  "characterResource.modify": ["TRIGGER_PLAYER", "ALL_PLAYERS"],
  /** 元宝变化只能作用于触发玩家或全部玩家。 */
  "coin.modify": ["TRIGGER_PLAYER", "ALL_PLAYERS"],
  /** 物品奖励当前只发放给触发玩家。 */
  "item.obtain": ["TRIGGER_PLAYER"],
  /** 随机物品池奖励当前只发放给触发玩家。 */
  "item.obtainFromPool": ["TRIGGER_PLAYER"],
  /** 状态可以施加给触发玩家或全部玩家。 */
  "status.add": ["TRIGGER_PLAYER", "ALL_PLAYERS"],
  /** 遭遇战斗当前只由触发玩家进入。 */
  "battle.start": ["TRIGGER_PLAYER"],
  /** 天气可以改变当前区域或整个世界。 */
  "weather.change": ["CURRENT_REGION", "WORLD"],
  /** 传送当前只移动触发玩家。 */
  "movement.teleport": ["TRIGGER_PLAYER"],
} as const satisfies Record<
  (typeof EVENT_EFFECT_IDS)[number],
  readonly (typeof EVENT_EFFECT_TARGET_TYPES)[number][]
>;

/** 事件效果序列中单项失败后的统一处理方式。 */
export const EVENT_EFFECT_FAILURE_POLICIES = [
  /** 当前效果失败时终止后续效果。 */
  "STOP",
  /** 当前效果失败时跳过该项并继续执行。 */
  "CONTINUE",
] as const;
