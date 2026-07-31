import { describe, expect, it } from "vitest";

import {
  CHARACTER_RESOURCE_DEFINITIONS,
  HEALTH_RESOURCE_DEFINITION,
} from "./character-resource-definitions.ts";

describe("character resource definitions", () => {
  it("configures health as a full resource bounded by maxHealth", () => {
    expect(HEALTH_RESOURCE_DEFINITION).toEqual({
      resourceId: "health",
      maximumDerivedAttribute: "maxHealth",
      minimum: 0,
      initialValue: { kind: "maximum" },
    });
    expect(CHARACTER_RESOURCE_DEFINITIONS.health).toBe(HEALTH_RESOURCE_DEFINITION);
  });
});
