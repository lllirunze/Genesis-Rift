/** 强制位移处理路径中间格或只处理最终目标的空间模式。 */
export const FORCED_DISPLACEMENT_MODES = ["PATH", "TELEPORT"] as const;

/** 强制位移遇到地图边界时采用的处理规则。 */
export const FORCED_DISPLACEMENT_BOUNDARY_BEHAVIORS = ["STOP", "FAIL"] as const;

/** 强制位移遇到不可进入目标时采用的处理规则。 */
export const FORCED_DISPLACEMENT_OBSTRUCTION_BEHAVIORS = ["STOP", "FAIL", "IGNORE"] as const;

/** 强制位移是否使用普通移动高度差限制。 */
export const FORCED_DISPLACEMENT_ELEVATION_RULES = ["NORMAL_LIMIT", "IGNORE"] as const;

/** 强制位移结算可能产生的标准结果。 */
export const FORCED_DISPLACEMENT_SETTLEMENT_OUTCOMES = [
  "completed",
  "stopped_at_boundary",
  "stopped_by_obstruction",
  "failed_at_boundary",
  "failed_by_obstruction",
] as const;
