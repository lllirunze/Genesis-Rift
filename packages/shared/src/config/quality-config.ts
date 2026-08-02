/** 当前版本可用于常规装备、物品和手牌的品质顺序。 */
export const STANDARD_QUALITY_LEVELS = [
  /** 普通品质，使用灰色表现。 */
  "common",
  /** 优秀品质，使用绿色表现。 */
  "excellent",
  /** 稀有品质，使用蓝色表现。 */
  "rare",
  /** 史诗品质，使用紫色表现。 */
  "epic",
  /** 传说品质，使用橙色表现。 */
  "legendary",
] as const;

/** 仅定义类型但暂不投入常规玩法的未来品质。 */
export const RESERVED_QUALITY_LEVELS = ["mythic"] as const;

/** 标准品质与预留品质组成的完整品质集合。 */
export const QUALITY_LEVELS = [...STANDARD_QUALITY_LEVELS, ...RESERVED_QUALITY_LEVELS] as const;

/** 当前可用标准品质在界面中的统一颜色映射。 */
export const QUALITY_COLORS = {
  common: "#9CA3AF",
  excellent: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F97316",
} as const;
