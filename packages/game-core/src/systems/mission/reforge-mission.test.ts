import { describe, expect, it } from "vitest";

import {
  COIN_ITEM_DEFINITION_ID,
  type ItemDefinitionCatalog,
  type PlayerId,
} from "@genesis-rift/shared";

import { getCoinBalance, receiveCoin } from "../economy/index.ts";
import { createPlayerInventory } from "../inventory/index.ts";
import { createRandomStreamSeed, RandomStream } from "../random/index.ts";

import type { MissionDefinitionCatalog } from "./mission-definition.ts";
import { createPlayerMissionState } from "./player-mission-state.ts";
import { reforgeMission } from "./reforge-mission.ts";
import { createMissionReforgeState } from "./mission-reforge-state.ts";

const PLAYER_ID = "player_a" as PlayerId;
const MISSION_IDS = [
  "mission_000001",
  "mission_000002",
  "mission_000003",
  "mission_000004",
  "mission_000005",
] as const;
const ITEM_DEFINITIONS = {
  [COIN_ITEM_DEFINITION_ID]: {
    definitionId: COIN_ITEM_DEFINITION_ID,
    name: "Coin",
    category: "currency",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 20,
  },
} as const satisfies ItemDefinitionCatalog;
const MISSION_DEFINITIONS = {
  mission_000001: createMission("mission_000001", "identity"),
  mission_000002: createMission("mission_000002", "faith"),
  mission_000003: createMission("mission_000003", "growth"),
  mission_000004: createMission("mission_000004", "world"),
  mission_000005: createMission("mission_000005", "free"),
  mission_000006: createMission("mission_000006", "growth"),
} as const satisfies MissionDefinitionCatalog;

describe("reforgeMission", () => {
  it("先生成同类型替代使命，再原子扣除元宝并记录成功次数", () => {
    const state = createPlayerMissionState(PLAYER_ID, MISSION_IDS, MISSION_DEFINITIONS);
    const inventory = receiveCoin(
      createPlayerInventory(PLAYER_ID),
      { quantity: 15, sourceId: "test", newItemInstanceIds: ["coin-1"] },
      ITEM_DEFINITIONS,
    ).inventory;
    const result = reforgeMission(createInput(state, inventory));

    expect(result).toMatchObject({
      outcome: "REFORGED",
      previousMissionId: "mission_000003",
      replacementMissionId: "mission_000006",
      coinCost: 10,
      reforgeState: { usedCount: 1, removedMissionIds: ["mission_000003"] },
    });
    if (result.outcome === "REFORGED") expect(getCoinBalance(result.inventory)).toBe(5);
  });

  it("元宝不足时不改变使命、重塑记录或背包状态", () => {
    const state = createPlayerMissionState(PLAYER_ID, MISSION_IDS, MISSION_DEFINITIONS);
    const inventory = createPlayerInventory(PLAYER_ID);
    const reforgeState = createMissionReforgeState(PLAYER_ID);
    const result = reforgeMission({ ...createInput(state, inventory), reforgeState });

    expect(result).toMatchObject({ outcome: "REJECTED", reason: "INSUFFICIENT_COIN" });
    expect(result.missionState).toBe(state);
    expect(result.inventory).toBe(inventory);
    expect(result.reforgeState).toBe(reforgeState);
  });
});

/** 创建一组满足玩家回合开始阶段的主动重塑输入。 */
function createInput(
  missionState: ReturnType<typeof createPlayerMissionState>,
  inventory: ReturnType<typeof createPlayerInventory>,
) {
  return {
    missionState,
    reforgeState: createMissionReforgeState(PLAYER_ID),
    inventory,
    missionId: "mission_000003",
    catalog: MISSION_DEFINITIONS,
    context: {
      identityId: "identity.mage",
      faithId: "faith.god",
      enabledModuleIds: [],
      availableContentIds: [],
      worldStateKeys: [],
    },
    randomStream: RandomStream.create(
      "mission",
      "reforge-test",
      createRandomStreamSeed("0123456789abcdef"),
    ),
    currentTurn: 1,
    isOwnerTurnStart: true,
    hasPerformedMainAction: false,
    isResolutionInProgress: false,
  } as const;
}

/** 创建测试使用的最小使命定义。 */
function createMission(
  missionId: string,
  type: "identity" | "faith" | "growth" | "world" | "free",
) {
  return {
    missionId,
    name: missionId,
    description: `Complete ${missionId}.`,
    type,
    progressKey: missionId,
    requiredProgress: 2,
    difficulty: "standard",
    baseWeight: 1,
    eligibility: {
      identityIds: [],
      faithIds: [],
      requiredModuleIds: [],
      requiredContentIds: [],
      requiredWorldStateKeys: [],
    },
    gameplayTags: [type],
    conflictTags: [],
    replacementGroupId: type,
  } as const;
}
