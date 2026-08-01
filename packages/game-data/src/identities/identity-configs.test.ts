import { describe, expect, it } from "vitest";

import { INITIAL_PRIMARY_ATTRIBUTE_TOTAL } from "../attributes/primary-attribute-config.ts";
import { validateIdentityConfigs } from "../validation/validate-identity-configs.ts";
import { IDENTITY_CONFIG_LIST, IDENTITY_CONFIGS } from "./identity-configs.ts";

describe("identity configs", () => {
  it("defines all six initial identities", () => {
    expect(Object.keys(IDENTITY_CONFIGS)).toEqual([
      "mage",
      "assassin",
      "thief",
      "ranger",
      "demon",
      "matriarch",
    ]);
  });

  it("keeps every initial primary attribute total at 25", () => {
    expect(() => validateIdentityConfigs(IDENTITY_CONFIG_LIST)).not.toThrow();

    for (const config of IDENTITY_CONFIG_LIST) {
      const total = Object.values(config.initialPrimaryAttributes).reduce(
        (sum, value) => sum + value,
        0,
      );

      expect(total).toBe(INITIAL_PRIMARY_ATTRIBUTE_TOTAL);
    }
  });

  it("preserves each identity attribute priority", () => {
    expect(() => validateIdentityConfigs(IDENTITY_CONFIG_LIST)).not.toThrow();

    expect(
      Object.fromEntries(
        IDENTITY_CONFIG_LIST.map((config) => [config.name, config.attributePriorities]),
      ),
    ).toEqual({
      mage: { primary: ["spirit"], secondary: ["insight"] },
      assassin: { primary: ["strength", "agility"], secondary: [] },
      thief: { primary: ["agility"], secondary: ["constitution"] },
      ranger: { primary: ["agility"], secondary: ["spirit"] },
      demon: { primary: ["strength", "constitution"], secondary: [] },
      matriarch: { primary: ["insight"], secondary: ["spirit", "constitution"] },
    });
  });
});
