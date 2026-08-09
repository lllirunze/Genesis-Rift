import { describe, expect, it } from "vitest";

import { validateNpcDefinitionCatalog } from "@genesis-rift/game-core";

import { NPC_DEFINITION_CATALOG } from "./npc-definitions.ts";

describe("NPC_DEFINITION_CATALOG", () => {
  it("contains valid NPC static definitions", () => {
    expect(() => validateNpcDefinitionCatalog(NPC_DEFINITION_CATALOG)).not.toThrow();
  });
});
