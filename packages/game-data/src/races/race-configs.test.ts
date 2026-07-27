import { describe, expect, it } from "vitest";

import { getPrimaryAttributeTotal } from "../attributes/primary-attributes.ts";
import { validateRaceConfigs } from "../validation/validate-race-configs.ts";
import { RACE_CONFIG_LIST, RACE_CONFIGS } from "./race-configs.ts";

describe("race configs", () => {
  it("defines all four initial races", () => {
    expect(Object.keys(RACE_CONFIGS)).toEqual(["human", "divine", "demon", "yokai"]);
  });

  it("keeps every initial primary attribute offset total at zero", () => {
    expect(() => validateRaceConfigs(RACE_CONFIG_LIST)).not.toThrow();

    for (const config of RACE_CONFIG_LIST) {
      expect(getPrimaryAttributeTotal(config.initialPrimaryAttributeOffset)).toBe(0);
    }
  });

  it("keeps race tendencies independent from identity configs", () => {
    expect(RACE_CONFIGS.human.attributeTendencies).toEqual({
      increased: [],
      decreased: [],
    });
    expect(RACE_CONFIGS.divine.attributeTendencies.increased).toEqual(["spirit", "insight"]);
    expect(RACE_CONFIGS.demon.attributeTendencies.increased).toEqual(["strength", "constitution"]);
    expect(RACE_CONFIGS.yokai.attributeTendencies.increased).toEqual(["agility", "insight"]);
  });
});
