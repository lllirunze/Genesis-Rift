/** 天气效果执行框架当前支持的标准效果类型。 */
export const WEATHER_EFFECT_TYPES = [
  "MOVEMENT_COST",
  "VISION_RANGE",
  "MOVEMENT_BLOCK",
  "DEFERRED",
] as const;

/** 单个天气效果允许增加的最大移动成本。 */
export const MAX_SINGLE_WEATHER_MOVEMENT_COST_MODIFIER = 2;

/** 多个天气同时生效时允许累计的最大移动成本。 */
export const MAX_TOTAL_WEATHER_MOVEMENT_COST_MODIFIER = 2;
