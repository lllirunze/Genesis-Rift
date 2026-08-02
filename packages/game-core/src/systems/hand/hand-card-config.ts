/** 手牌按照主要使用场景划分的类型。 */
export const HAND_CARD_TYPES = ["combat", "action", "event", "trick", "survival"] as const;

/** 手牌允许主动使用或在结算前响应使用的时机。 */
export const HAND_CARD_USAGE_TIMINGS = ["active", "response"] as const;

/** 当前可被手牌响应并插入结算流程的业务节点。 */
export const HAND_CARD_RESPONSE_TYPES = [
  "attack.beforeHit",
  "damage.beforeResolution",
  "healing.beforeResolution",
  "movement.beforeResolution",
  "exploration.beforeResolution",
  "event.beforeResolution",
  "trade.beforeResolution",
  "handCard.beforeResolution",
  "weather.beforeResolution",
  "status.beforeApplication",
] as const;

/** 手牌配置可以引用的基础使用条件标识。 */
export const HAND_CARD_CONDITION_IDS = [
  "turn.isOwnerTurn",
  "turn.isStart",
  "turn.isEnd",
  "player.canMove",
  "player.isInCombat",
  "player.isDying",
  "source.isOwnAttack",
  "target.isSelf",
  "target.isAlly",
  "target.isEnemy",
  "weather.isRaining",
  "time.isDay",
  "time.isNight",
] as const;

/** 手牌效果目前可以选择的目标类别。 */
export const HAND_CARD_TARGET_TYPES = [
  "player",
  "npc",
  "monster",
  "tile",
  "area",
  "item",
  "handCard",
  "event",
  "action",
  "status",
] as const;

/** 已注册或预留注册入口的手牌效果标识。 */
export const HAND_CARD_EFFECT_IDS = [
  "attack.modifyHit",
  "damage.reduce",
  "health.restore",
  "movement.modify",
  "status.add",
  "status.remove",
  "weather.change",
  "item.obtain",
  "handCard.draw",
] as const;

/** 单个手牌效果处理器允许返回的执行结果。 */
export const HAND_CARD_EFFECT_EXECUTION_OUTCOMES = ["applied", "skipped"] as const;

/** 手牌使用结算后允许进入的牌区。 */
export const HAND_CARD_DESTINATIONS = ["discard", "hand"] as const;

/** 不依赖固定回合抽牌的手牌获取来源。 */
export const HAND_CARD_DRAW_SOURCE_TYPES = [
  "chest",
  "event",
  "destiny",
  "npcReward",
  "dungeon",
  "boss",
  "shop",
  "specialLocation",
  "specialEffect",
] as const;

/** 玩家默认允许保留的最大手牌数量。 */
export const DEFAULT_HAND_SIZE_LIMIT = 6;
/** 游戏开始时从共享牌库发给每名玩家的手牌数量。 */
export const DEFAULT_INITIAL_HAND_SIZE = 2;
