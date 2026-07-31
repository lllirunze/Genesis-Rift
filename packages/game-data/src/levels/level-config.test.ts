import { describe, expect, it } from "vitest";

import { validateLevelSystemConfig } from "../validation/validate-level-system-config.ts";
import { LEVEL_SYSTEM_CONFIG } from "./level-config.ts";

describe("level system config", () => {
  it("defines the documented level 1 to level 10 experience curve", () => {
    expect(() => validateLevelSystemConfig(LEVEL_SYSTEM_CONFIG)).not.toThrow();
    expect(LEVEL_SYSTEM_CONFIG.levels.map((definition) => definition.experienceRequired)).toEqual([
      0, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    expect(
      LEVEL_SYSTEM_CONFIG.levels
        .slice(1)
        .map((definition) => definition.freePrimaryAttributePoints),
    ).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
  });

  it("rejects missing or out-of-order level definitions", () => {
    expect(() =>
      validateLevelSystemConfig({
        ...LEVEL_SYSTEM_CONFIG,
        levels: [LEVEL_SYSTEM_CONFIG.levels[0]!, LEVEL_SYSTEM_CONFIG.levels[2]!],
      }),
    ).toThrow("levels must contain exactly 10 definitions");

    expect(() =>
      validateLevelSystemConfig({
        ...LEVEL_SYSTEM_CONFIG,
        levels: LEVEL_SYSTEM_CONFIG.levels.map((definition, index) =>
          index === 1 ? { ...definition, level: 4 } : definition,
        ),
      }),
    ).toThrow("levels[1].level must be 2");
  });

  it("rejects invalid experience and attribute point values", () => {
    expect(() =>
      validateLevelSystemConfig({
        ...LEVEL_SYSTEM_CONFIG,
        levels: LEVEL_SYSTEM_CONFIG.levels.map((definition, index) =>
          index === 1 ? { ...definition, experienceRequired: -1 } : definition,
        ),
      }),
    ).toThrow("levels[1].experienceRequired must be a non-negative safe integer");

    expect(() =>
      validateLevelSystemConfig({
        ...LEVEL_SYSTEM_CONFIG,
        levels: LEVEL_SYSTEM_CONFIG.levels.map((definition, index) =>
          index === 1 ? { ...definition, freePrimaryAttributePoints: 0.5 } : definition,
        ),
      }),
    ).toThrow("levels[1].freePrimaryAttributePoints must be a non-negative safe integer");
  });
});
