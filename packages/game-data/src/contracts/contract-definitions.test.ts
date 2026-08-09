import { describe, expect, it } from "vitest";

import { validateContractDefinitionCatalog } from "@genesis-rift/game-core";

import { CONTRACT_DEFINITIONS } from "./contract-definitions.ts";

describe("CONTRACT_DEFINITIONS", () => {
  it("符合神鬼契约资源规范，并包含立即正面与延迟负面效果", () => {
    expect(() => validateContractDefinitionCatalog(CONTRACT_DEFINITIONS)).not.toThrow();
    expect(CONTRACT_DEFINITIONS.contract_000001).toMatchObject({
      contractId: "contract_000001",
      buff: { effectId: "physical_attack_bonus" },
      debuff: { effectId: "disable_active_healing_item" },
      debuffTrigger: { type: "PERSONAL_TURN", personalTurnDelay: 7 },
    });
  });
});
