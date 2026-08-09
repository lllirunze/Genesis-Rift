import { describe, expect, it } from "vitest";

import { validateSkillDefinitionCatalog } from "@genesis-rift/game-core";

import { SKILL_DEFINITION_CATALOG } from "./skill-definitions.ts";

describe("SKILL_DEFINITION_CATALOG", () => {
  it("contains valid V1 skill definitions", () => {
    expect(() => validateSkillDefinitionCatalog(SKILL_DEFINITION_CATALOG)).not.toThrow();
  });
});
