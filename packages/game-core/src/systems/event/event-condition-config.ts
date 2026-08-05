/** 事件定义当前可以引用的基础触发条件标识。 */
export const EVENT_CONDITION_IDS = [
  /** 当前地图区域与指定区域一致。 */
  "map.regionIs",
  /** 当前地块地形与指定地形一致。 */
  "map.terrainIs",
  /** 当前地块包含指定地图特征。 */
  "map.featureIs",
  /** 当前天气与指定天气一致。 */
  "weather.is",
  /** 当前昼夜阶段与指定阶段一致。 */
  "time.is",
  /** 触发玩家等级达到指定下限。 */
  "player.levelAtLeast",
  /** 触发玩家当前未处于战斗状态。 */
  "player.isNotInBattle",
  /** 触发玩家当前身份或职业与指定配置一致。 */
  "player.identityIs",
  /** 触发玩家种族与指定配置一致。 */
  "player.raceIs",
  /** 触发玩家隐藏信仰与指定配置一致。 */
  "player.faithIs",
  /** 指定任务处于指定阶段。 */
  "quest.stageIs",
  /** 当前副本与指定副本一致。 */
  "dungeon.is",
  /** 当前世界包含指定状态。 */
  "world.stateIs",
  /** 触发玩家背包拥有足量指定物品。 */
  "inventory.hasItem",
  /** 触发玩家穿戴指定装备。 */
  "equipment.has",
  /** 触发玩家拥有足量指定运行时资源。 */
  "resource.atLeast",
  /** 指定前置事件已经完成揭露。 */
  "event.wasRevealed",
  /** 指定互斥事件尚未完成揭露。 */
  "event.wasNotRevealed",
  /** 本次触发来源是玩家首次探索当前地点。 */
  "exploration.isFirstVisit",
] as const;

/** 事件条件组当前支持的逻辑关系。 */
export const EVENT_CONDITION_GROUP_OPERATORS = [
  /** 组内全部条件必须成立。 */
  "ALL",
  /** 组内任意一个条件成立即可。 */
  "ANY",
] as const;

/** 事件触发条件允许的最大嵌套层数。 */
export const MAX_EVENT_CONDITION_GROUP_DEPTH = 8;
