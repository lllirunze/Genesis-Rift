/** 当前模块对外公开的只读配置值。 */
export const REGION_CATEGORIES = ["wilderness", "civilized", "special"] as const;

/** 当前模块对外公开的只读配置值。 */
export const TILE_PASSABILITY_STATES = ["passable", "blocked"] as const;

/** 基础地形允许配置的最小进入移动成本修正。 */
export const MIN_TERRAIN_MOVEMENT_COST_MODIFIER = 0;

/** 基础地形允许配置的最大进入移动成本修正。 */
export const MAX_TERRAIN_MOVEMENT_COST_MODIFIER = 2;

/** 当前模块对外公开的只读配置值。 */
export const TILE_FEATURE_TYPES = [
  "event",
  "npc",
  "resource",
  "road",
  "portal",
  "structure",
] as const;
