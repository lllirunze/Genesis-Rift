import { describe, expect, it } from "vitest";

import type { ContractDefinitionCatalog } from "./contract-definition.ts";
import {
  advanceContractAtPersonalTurnStart,
  createDivineContractState,
  offerContract,
  rejectPendingContract,
  signPendingContract,
} from "./contract-runtime-state.ts";

/** 契约运行时测试使用的最小静态资源注册表。 */
const CONTRACTS: ContractDefinitionCatalog = {
  contract_000001: {
    contractId: "contract_000001",
    name: "bloodboundBlade",
    description: "A private contract.",
    strength: "STRONG",
    baseWeight: 10,
    triggerTags: ["NIGHT_EVENT"],
    allowedWorldStageIds: ["RIFT_STAGE"],
    buff: { effectId: "physical_attack_bonus", type: "ATTRIBUTE_MODIFIER", value: 4, tags: [] },
    debuff: {
      effectId: "disable_active_healing_item",
      type: "GAMEPLAY_RULE",
      value: null,
      tags: [],
    },
    debuffTrigger: {
      type: "PERSONAL_TURN",
      personalTurnDelay: 2,
      worldStageId: null,
      latestPersonalTurn: null,
    },
  },
};

describe("divine contract runtime state", () => {
  it("signs a pending offer once and immediately emits the permanent buff", () => {
    const offered = offerContract(
      createDivineContractState("player_a"),
      CONTRACTS,
      "opportunity_a",
      "contract_000001",
    );
    const result = signPendingContract(offered, CONTRACTS, 3, 8);

    expect(result.state).toMatchObject({
      hasSigned: true,
      signedContractId: "contract_000001",
      personalTurnsElapsed: 0,
      buffActive: true,
      debuffActive: false,
      pendingOffer: null,
    });
    expect(result.instructions).toEqual([
      expect.objectContaining({
        phase: "BUFF",
        ownerId: "player_a",
        contractId: "contract_000001",
      }),
    ]);
    expect(() =>
      offerContract(result.state, CONTRACTS, "opportunity_b", "contract_000001"),
    ).toThrow("at most one");
  });

  it("activates the delayed debuff once at the start of the configured personal turn", () => {
    const signed = signPendingContract(
      offerContract(
        createDivineContractState("player_a"),
        CONTRACTS,
        "opportunity_a",
        "contract_000001",
      ),
      CONTRACTS,
      1,
      1,
    ).state;
    const firstTurn = advanceContractAtPersonalTurnStart(signed, CONTRACTS, null);
    const secondTurn = advanceContractAtPersonalTurnStart(firstTurn.state, CONTRACTS, null);
    const duplicateAdvance = advanceContractAtPersonalTurnStart(secondTurn.state, CONTRACTS, null);

    expect(firstTurn.instructions).toEqual([]);
    expect(secondTurn.state).toMatchObject({ personalTurnsElapsed: 2, debuffActive: true });
    expect(secondTurn.instructions).toEqual([
      expect.objectContaining({
        phase: "DEBUFF",
        effect: expect.objectContaining({ effectId: "disable_active_healing_item" }),
      }),
    ]);
    expect(duplicateAdvance.instructions).toEqual([]);
    expect(duplicateAdvance.state).toBe(secondTurn.state);
  });

  it("records a rejected offer without creating any active contract effect", () => {
    const offered = offerContract(
      createDivineContractState("player_a"),
      CONTRACTS,
      "opportunity_a",
      "contract_000001",
    );
    const rejected = rejectPendingContract(offered, CONTRACTS);

    expect(rejected).toMatchObject({ hasSigned: false, pendingOffer: null });
    expect(rejected.offerHistory).toEqual([
      { opportunityId: "opportunity_a", contractId: "contract_000001", outcome: "REJECTED" },
    ]);
  });
});
