import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { createRandomStreamSeed, RandomStream } from "../random/index.ts";

import type { MissionDefinitionCatalog } from "./mission-definition.ts";
import { generateMissionSet, generatePlayerMissionState } from "./generate-mission-set.ts";

const CONTEXT = {
  identityId: "identity.mage",
  faithId: "faith.god",
  enabledModuleIds: [],
  availableContentIds: [],
  worldStateKeys: [],
} as const;

const CATALOG = {
  mission_000001: createMission("mission_000001", "identity", "battle"),
  mission_000002: createMission("mission_000002", "faith", "event"),
  mission_000003: createMission("mission_000003", "growth", "growth"),
  mission_000004: createMission("mission_000004", "world", "explore"),
  mission_000005: createMission("mission_000005", "free", "trade"),
  mission_000006: {
    ...createMission("mission_000006", "free", "trade", ["identity-conflict"]),
    baseWeight: 0,
  },
} as const satisfies MissionDefinitionCatalog;

describe("generateMissionSet", () => {
  it("按固定五类生成一组无重复且拥有足够玩法覆盖的使命", () => {
    const result = generateMissionSet({
      catalog: CATALOG,
      context: CONTEXT,
      randomStream: createMissionStream(),
    });

    expect(result.missions.map((mission) => mission.type)).toEqual([
      "identity",
      "faith",
      "growth",
      "world",
      "free",
    ]);
    expect(new Set(result.missions.map((mission) => mission.missionId))).toHaveLength(5);
    expect(
      new Set(result.missions.flatMap((mission) => mission.gameplayTags)).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it("在普通候选均被排除时使用同类型且兼容的保底使命", () => {
    const result = generateMissionSet({
      catalog: CATALOG,
      context: CONTEXT,
      randomStream: createMissionStream(),
      excludedMissionIds: ["mission_000005"],
      fallbackMissionIds: { free: "mission_000006" },
    });

    expect(result.missions.at(-1)?.missionId).toBe("mission_000006");
  });

  it("拒绝与已选使命冲突的保底使命", () => {
    const conflictingCatalog = {
      ...CATALOG,
      mission_000001: createMission("mission_000001", "identity", "battle", ["shared"]),
      mission_000006: {
        ...createMission("mission_000006", "free", "trade", ["shared"]),
        baseWeight: 0,
      },
    } as const satisfies MissionDefinitionCatalog;

    expect(() =>
      generateMissionSet({
        catalog: conflictingCatalog,
        context: CONTEXT,
        randomStream: createMissionStream(),
        excludedMissionIds: ["mission_000005"],
        fallbackMissionIds: { free: "mission_000006" },
      }),
    ).toThrow("Invalid fallback mission for type: free");
  });

  it("将完成组合检查的使命资源直接创建为玩家私有使命状态", () => {
    const result = generatePlayerMissionState({
      catalog: CATALOG,
      context: CONTEXT,
      randomStream: createMissionStream(),
      ownerId: "player_a" as PlayerId,
    });

    expect(result.state.missions.map((mission) => mission.missionId)).toEqual(
      result.generatedSet.missions.map((mission) => mission.missionId),
    );
  });
});

/** 创建使命组合生成测试使用的独立随机流。 */
function createMissionStream(): RandomStream {
  return RandomStream.create(
    "mission",
    "mission-set-test",
    createRandomStreamSeed("0123456789abcdef"),
  );
}

/** 创建组合生成测试所需的最小静态使命定义。 */
function createMission(
  missionId: string,
  type: "identity" | "faith" | "growth" | "world" | "free",
  gameplayTag: string,
  conflictTags: readonly string[] = [],
) {
  return {
    missionId,
    name: `Mission ${missionId}`,
    description: `Complete ${missionId}.`,
    type,
    progressKey: gameplayTag,
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
    gameplayTags: [gameplayTag],
    conflictTags,
    replacementGroupId: `${type}-group`,
  } as const;
}
