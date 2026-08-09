import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { createRandomStreamSeed, RandomStream } from "../random/index.ts";

import type { MissionDefinitionCatalog } from "./mission-definition.ts";
import { createPlayerMissionState } from "./player-mission-state.ts";
import { replaceInfeasibleMissionAutomatically } from "./replace-infeasible-mission.ts";

const PLAYER_ID = "player_a" as PlayerId;
const MISSION_IDS = [
  "mission_000001",
  "mission_000002",
  "mission_000003",
  "mission_000004",
  "mission_000005",
] as const;

const CATALOG = {
  mission_000001: createMission("mission_000001", "identity", "defeat", "identity"),
  mission_000002: createMission("mission_000002", "faith", "pray", "faith"),
  mission_000003: createMission("mission_000003", "growth", "grow", "growth"),
  mission_000004: createMission("mission_000004", "world", "old-world", "world"),
  mission_000005: createMission("mission_000005", "free", "trade", "free"),
  mission_000006: createMission("mission_000006", "world", "new-world", "world"),
} as const satisfies MissionDefinitionCatalog;

describe("replaceInfeasibleMissionAutomatically", () => {
  it("仅从同类型和同替换分组的未持有使命中自动选择替代项", () => {
    const result = replaceInfeasibleMissionAutomatically({
      state: createPlayerMissionState(PLAYER_ID, MISSION_IDS, CATALOG),
      catalog: CATALOG,
      context: {
        identityId: "identity.mage",
        faithId: "faith.god",
        enabledModuleIds: [],
        availableContentIds: [],
        worldStateKeys: [],
      },
      randomStream: RandomStream.create(
        "mission",
        "automatic-replacement-test",
        createRandomStreamSeed("0123456789abcdef"),
      ),
      missionId: "mission_000004",
      reason: "WORLD_INVALIDATED",
      currentTurn: 8,
    });

    expect(result.replacementMissionId).toBe("mission_000006");
    expect(result.state.missions[3]?.missionId).toBe("mission_000006");
    expect(result.state.replacementHistory).toEqual([
      {
        previousMissionId: "mission_000004",
        replacementMissionId: "mission_000006",
        reason: "WORLD_INVALIDATED",
        replacedAtTurn: 8,
      },
    ]);
  });
});

/** 创建自动替换测试所需的最小静态使命定义。 */
function createMission(
  missionId: string,
  type: "identity" | "faith" | "growth" | "world" | "free",
  progressKey: string,
  replacementGroupId: string,
) {
  return {
    missionId,
    name: missionId,
    description: `Complete ${missionId}.`,
    type,
    progressKey,
    requiredProgress: 1,
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
    replacementGroupId,
  } as const;
}
