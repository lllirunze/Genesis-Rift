import type { LevelSystemConfig } from "@genesis-rift/shared";

export const LEVEL_SYSTEM_CONFIG = {
  initialLevel: 1,
  maximumLevel: 10,
  levels: [
    { level: 1, experienceRequired: 0, freePrimaryAttributePoints: 0 },
    { level: 2, experienceRequired: 20, freePrimaryAttributePoints: 1 },
    { level: 3, experienceRequired: 30, freePrimaryAttributePoints: 1 },
    { level: 4, experienceRequired: 40, freePrimaryAttributePoints: 1 },
    { level: 5, experienceRequired: 50, freePrimaryAttributePoints: 2 },
    { level: 6, experienceRequired: 60, freePrimaryAttributePoints: 2 },
    { level: 7, experienceRequired: 70, freePrimaryAttributePoints: 2 },
    { level: 8, experienceRequired: 80, freePrimaryAttributePoints: 3 },
    { level: 9, experienceRequired: 90, freePrimaryAttributePoints: 3 },
    { level: 10, experienceRequired: 100, freePrimaryAttributePoints: 3 },
  ],
} as const satisfies LevelSystemConfig;
