import { validateEncounterDefinitionCatalog } from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import { ENCOUNTER_DEFINITION_CATALOG } from "./encounter-definitions.ts";

describe("ENCOUNTER_DEFINITION_CATALOG", () => {
  it("provides valid event encounter definitions", () => {
    expect(() => validateEncounterDefinitionCatalog(ENCOUNTER_DEFINITION_CATALOG)).not.toThrow();
  });
});
