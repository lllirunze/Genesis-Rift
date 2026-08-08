/** 项目当前允许使用的静态资源 ID 类型前缀。 */
export const RESOURCE_ID_PREFIXES = [
  "event",
  "quest",
  "mission",
  "equip",
  "item",
  "card",
  "npc",
  "buff",
  "debuff",
  "terrain",
  "region",
  "weather",
  "skill",
  "contract",
] as const;

/** 静态资源编号允许使用的最小值，零号保留不用。 */
export const MIN_RESOURCE_ID_NUMBER = 1;

/** 六位十进制编号允许使用的最大值。 */
export const MAX_RESOURCE_ID_NUMBER = 999_999;
