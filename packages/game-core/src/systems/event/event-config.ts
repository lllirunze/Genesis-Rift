/** 事件按照主要作用与内容定位划分的类别。 */
export const EVENT_CATEGORIES = [
  /** 提供常见探索反馈与轻量互动。 */
  "common",
  /** 围绕命运判定与重要选择展开。 */
  "destiny",
  /** 生成敌人、NPC 或临时交互对象。 */
  "encounter",
  /** 影响多个玩家、区域或整个世界。 */
  "world",
  /** 对地图环境或区域造成负面影响。 */
  "disaster",
  /** 提供隐藏机会、特殊地点或稀有奖励。 */
  "adventure",
  /** 提供正面持续效果。 */
  "blessing",
  /** 施加负面状态或持续代价。 */
  "curse",
  /** 承载原作致敬与趣味隐藏内容。 */
  "easterEgg",
] as const;

/** 事件当前支持的揭露方式。 */
export const EVENT_REVEAL_MODES = [
  /** 事件抽取后自动公开，玩家不能放弃。 */
  "FORCED",
  /** 只展示统一卡背，由触发者选择揭露或放弃。 */
  "OPTIONAL",
] as const;

/** 事件在单局游戏中的重复触发规则。 */
export const EVENT_REPEAT_RULES = [
  /** 满足冷却与其他条件后可以再次触发。 */
  "repeatable",
  /** 每名玩家在一局游戏中最多触发一次。 */
  "oncePerPlayer",
  /** 整局游戏中无论由谁触发都只发生一次。 */
  "oncePerGame",
] as const;
