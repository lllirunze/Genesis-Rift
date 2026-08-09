import { describe, expect, it } from "vitest";

import { createRandomStreamSeed, RandomStream } from "../random/index.ts";
import type { ContractDefinitionCatalog } from "./contract-definition.ts";
import { createDivineContractState } from "./contract-runtime-state.ts";
import {
  filterEligibleContractDefinitions,
  offerRandomContract,
  selectContractOffer,
} from "./select-contract-offer.ts";

/** 契约机会筛选测试使用的最小资源注册表。 */
const CONTRACTS: ContractDefinitionCatalog = {
  contract_000001: createContract("contract_000001", 10, ["NIGHT_EVENT"], ["RIFT_STAGE"]),
  contract_000002: createContract("contract_000002", 20, ["RUIN_EXPLORATION"], ["RIFT_STAGE"]),
  contract_000003: createContract("contract_000003", 30, ["NIGHT_EVENT"], ["FINAL_STAGE"]),
  contract_000004: createContract("contract_000004", 0, ["NIGHT_EVENT"], ["RIFT_STAGE"]),
};

describe("contract offer selection", () => {
  it("filters definitions by world stage, trigger tag, and positive weight", () => {
    const candidates = filterEligibleContractDefinitions(CONTRACTS, {
      worldStageId: "RIFT_STAGE",
      triggerTags: ["NIGHT_EVENT", "OTHER"],
    });

    expect(candidates.map((candidate) => candidate.contractId)).toEqual(["contract_000001"]);
  });

  it("uses only the contract random stream and returns null without candidates", () => {
    const stream = createContractStream();

    expect(
      selectContractOffer(stream, CONTRACTS, {
        worldStageId: "RIFT_STAGE",
        triggerTags: ["RUIN_EXPLORATION"],
      })?.contractId,
    ).toBe("contract_000002");
    expect(
      selectContractOffer(stream, CONTRACTS, {
        worldStageId: "RIFT_STAGE",
        triggerTags: ["NO_MATCH"],
      }),
    ).toBeNull();
    expect(() =>
      selectContractOffer(
        RandomStream.create("event", null, createRandomStreamSeed("0123456789abcdef")),
        CONTRACTS,
        { worldStageId: "RIFT_STAGE", triggerTags: ["NIGHT_EVENT"] },
      ),
    ).toThrow("contract random stream");
  });

  it("creates one private pending offer and does not replace signed or pending state", () => {
    const first = offerRandomContract(
      createDivineContractState("player_a"),
      CONTRACTS,
      "opportunity_a",
      createContractStream(),
      { worldStageId: "RIFT_STAGE", triggerTags: ["RUIN_EXPLORATION"] },
    );
    const second = offerRandomContract(
      first.state,
      CONTRACTS,
      "opportunity_b",
      createContractStream(),
      { worldStageId: "RIFT_STAGE", triggerTags: ["RUIN_EXPLORATION"] },
    );

    expect(first).toMatchObject({
      contractId: "contract_000002",
      state: { pendingOffer: { opportunityId: "opportunity_a", contractId: "contract_000002" } },
    });
    expect(second).toEqual({ state: first.state, contractId: null });
  });
});

/** 创建满足最小定义校验的契约资源。 */
function createContract(
  contractId: string,
  baseWeight: number,
  triggerTags: readonly string[],
  allowedWorldStageIds: readonly string[],
) {
  return {
    contractId,
    name: contractId,
    description: "A private contract.",
    strength: "NORMAL" as const,
    baseWeight,
    triggerTags,
    allowedWorldStageIds,
    buff: { effectId: "buff", type: "ATTRIBUTE_MODIFIER" as const, value: 1, tags: [] },
    debuff: { effectId: "debuff", type: "GAMEPLAY_RULE" as const, value: null, tags: [] },
    debuffTrigger: {
      type: "PERSONAL_TURN" as const,
      personalTurnDelay: 3,
      worldStageId: null,
      latestPersonalTurn: null,
    },
  };
}

/** 创建稳定的契约随机流，保证抽取结果可以复现。 */
function createContractStream(): RandomStream {
  return RandomStream.create("contract", null, createRandomStreamSeed("0123456789abcdef"));
}
