/** NPC 当前可提供的基础服务类型。 */
export const NPC_SERVICE_TYPES = ["crafting", "shop"] as const;

/** NPC 交互资格检查可能返回的稳定失败原因。 */
export const NPC_INTERACTION_INELIGIBILITY_REASONS = [
  "NPC_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "OUT_OF_RANGE",
  "ENVIRONMENT_UNAVAILABLE",
] as const;
