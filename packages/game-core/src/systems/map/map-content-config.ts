/** 当前模块对外公开的只读配置值。 */
export const REGION_CATEGORIES = ["wilderness", "civilized", "special"] as const;

/** 当前模块对外公开的只读配置值。 */
export const TILE_PASSABILITY_STATES = ["passable", "blocked"] as const;

/** 当前模块对外公开的只读配置值。 */
export const TILE_FEATURE_TYPES = [
  "event",
  "npc",
  "resource",
  "road",
  "portal",
  "structure",
] as const;
