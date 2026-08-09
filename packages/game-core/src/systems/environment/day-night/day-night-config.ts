import type { DayNightPeriodDefinitionCatalog } from "./day-night-definition.ts";

/** 每个昼夜阶段固定持续五个完整轮次。 */
export const DAY_NIGHT_PHASE_DURATION_ROUNDS = 5;

/** 当前业务对象的静态定义配置。 */
export const DAY_NIGHT_PERIOD_DEFINITION_CATALOG = {
  day: {
    periodId: "day",
    publicTags: ["day", "daytime", "public-service-open"],
    visionModifier: 0,
  },
  night: {
    periodId: "night",
    publicTags: ["night", "nighttime", "secret-action"],
    visionModifier: -1,
  },
} as const satisfies DayNightPeriodDefinitionCatalog;
