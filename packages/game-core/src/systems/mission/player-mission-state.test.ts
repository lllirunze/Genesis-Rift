import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import type { MissionDefinitionCatalog } from "./mission-definition.ts";
import {
  applyMissionProgressEvent,
  confirmMissionVictoriesAtResolutionEnd,
  createPlayerMissionState,
  replaceInfeasibleMission,
} from "./player-mission-state.ts";

const PLAYER_A = "player_a" as PlayerId;
const PLAYER_B = "player_b" as PlayerId;

const MISSION_IDS = [
  "mission_000001",
  "mission_000002",
  "mission_000003",
  "mission_000004",
  "mission_000005",
] as const;

const DEFINITIONS = {
  mission_000001: createMission("mission_000001", "identity", "defeatElite", "identity-group"),
  mission_000002: createMission("mission_000002", "faith", "offerPrayer", "faith-group"),
  mission_000003: createMission("mission_000003", "growth", "reachLevel", "growth-group"),
  mission_000004: createMission("mission_000004", "world", "exploreMountain", "world-group"),
  mission_000005: createMission("mission_000005", "free", "completeTrade", "free-group"),
  mission_000006: createMission("mission_000006", "world", "exploreRuin", "world-group"),
} as const satisfies MissionDefinitionCatalog;

describe("player mission state", () => {
  it("要求玩家持有五类各一项的隐藏使命", () => {
    const state = createPlayerMissionState(PLAYER_A, MISSION_IDS, DEFINITIONS);

    expect(state).toMatchObject({
      ownerId: PLAYER_A,
      victoryStatus: "NONE",
      missions: MISSION_IDS.map((missionId) => ({ missionId, currentProgress: 0 })),
    });
    expect(() =>
      createPlayerMissionState(
        PLAYER_A,
        ["mission_000001", "mission_000002", "mission_000003", "mission_000004", "mission_000006"],
        DEFINITIONS,
      ),
    ).toThrow("duplicate types");
  });

  it("完成第三个使命时先进入待确认胜利状态，完整结算结束后才确认获胜", () => {
    let state = createPlayerMissionState(PLAYER_A, MISSION_IDS, DEFINITIONS);

    state = applyProgress(state, "defeatElite", 10);
    state = applyProgress(state, "offerPrayer", 10);
    state = applyProgress(state, "reachLevel", 10);

    expect(state.victoryStatus).toBe("PENDING_CONFIRMATION");
    expect(state.missions.slice(0, 3)).toMatchObject([
      { completedAtTurn: 10, completedSourceId: "source-defeatElite" },
      { completedAtTurn: 10, completedSourceId: "source-offerPrayer" },
      { completedAtTurn: 10, completedSourceId: "source-reachLevel" },
    ]);

    const result = confirmMissionVictoriesAtResolutionEnd([state], DEFINITIONS);

    expect(result.winnerIds).toEqual([PLAYER_A]);
    expect(result.states[0]?.victoryStatus).toBe("CONFIRMED");
  });

  it("允许同一完整结算内满足条件的多名玩家共同获胜", () => {
    let playerA = createPlayerMissionState(PLAYER_A, MISSION_IDS, DEFINITIONS);
    let playerB = createPlayerMissionState(PLAYER_B, MISSION_IDS, DEFINITIONS);

    for (const progressKey of ["defeatElite", "offerPrayer", "reachLevel"]) {
      playerA = applyProgress(playerA, progressKey, 5);
      playerB = applyProgress(playerB, progressKey, 5);
    }

    expect(
      confirmMissionVictoriesAtResolutionEnd([playerA, playerB], DEFINITIONS).winnerIds,
    ).toEqual([PLAYER_A, PLAYER_B]);
  });

  it("仅允许以相同类型和替换分组的新使命自动替换未完成使命", () => {
    const state = createPlayerMissionState(PLAYER_A, MISSION_IDS, DEFINITIONS);
    const replaced = replaceInfeasibleMission(
      state,
      DEFINITIONS,
      "mission_000004",
      "mission_000006",
      "WORLD_INVALIDATED",
      12,
    );

    expect(replaced.missions[3]).toEqual({
      missionId: "mission_000006",
      currentProgress: 0,
      completedAtTurn: null,
      completedSourceId: null,
    });
    expect(replaced.replacementHistory).toEqual([
      {
        previousMissionId: "mission_000004",
        replacementMissionId: "mission_000006",
        reason: "WORLD_INVALIDATED",
        replacedAtTurn: 12,
      },
    ]);
  });
});

/** 为指定进度口径提交一条已经确认的使命进度事件。 */
function applyProgress(
  state: ReturnType<typeof createPlayerMissionState>,
  progressKey: string,
  count: number,
) {
  return applyMissionProgressEvent(
    state,
    DEFINITIONS,
    { progressKey, count, sourceId: `source-${progressKey}` },
    10,
  );
}

/** 创建用于使命运行时测试的最小静态使命定义。 */
function createMission(
  missionId: string,
  type: "identity" | "faith" | "growth" | "world" | "free",
  progressKey: string,
  replacementGroupId: string,
) {
  return {
    missionId,
    name: `Mission ${missionId}`,
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
