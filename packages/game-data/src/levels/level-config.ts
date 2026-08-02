import type { LevelSystemConfig } from "@genesis-rift/shared";

/** 角色从一级到十级的经验需求与自由属性点收益配置。 */
export const LEVEL_SYSTEM_CONFIG = {
  initialLevel: 1,
  maximumLevel: 10,
  levels: [
    /** 一级为角色初始状态，不需要经验且不提供升级属性点。 */
    { level: 1, experienceRequired: 0, freePrimaryAttributePoints: 0 },
    /** 二至四级属于前期成长阶段，每次升级获得一点自由属性。 */
    { level: 2, experienceRequired: 20, freePrimaryAttributePoints: 1 },
    { level: 3, experienceRequired: 30, freePrimaryAttributePoints: 1 },
    { level: 4, experienceRequired: 40, freePrimaryAttributePoints: 1 },
    /** 五至七级属于中期成长阶段，每次升级获得两点自由属性。 */
    { level: 5, experienceRequired: 50, freePrimaryAttributePoints: 2 },
    { level: 6, experienceRequired: 60, freePrimaryAttributePoints: 2 },
    { level: 7, experienceRequired: 70, freePrimaryAttributePoints: 2 },
    /** 八至十级属于后期成长阶段，每次升级获得三点自由属性。 */
    { level: 8, experienceRequired: 80, freePrimaryAttributePoints: 3 },
    { level: 9, experienceRequired: 90, freePrimaryAttributePoints: 3 },
    { level: 10, experienceRequired: 100, freePrimaryAttributePoints: 3 },
  ],
} as const satisfies LevelSystemConfig;
