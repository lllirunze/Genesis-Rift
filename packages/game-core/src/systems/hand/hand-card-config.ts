export const HAND_CARD_TYPES = ["combat", "action", "event", "trick", "survival"] as const;

export const HAND_CARD_USAGE_TIMINGS = ["active", "response"] as const;

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

export const HAND_CARD_DESTINATIONS = ["discard", "hand"] as const;

export const DEFAULT_HAND_SIZE_LIMIT = 6;
export const DEFAULT_INITIAL_HAND_SIZE = 2;
