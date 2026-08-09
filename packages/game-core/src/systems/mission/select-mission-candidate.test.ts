import { describe, expect, it } from "vitest";

import { createRandomStreamSeed, RandomStream } from "../random/index.ts";

import type { MissionDefinitionCatalog } from "./mission-definition.ts";
import { selectMissionCandidate } from "./select-mission-candidate.ts";

const CATALOG = {
  mission_000001: createMission("mission_000001", 1),
  mission_000002: createMission("mission_000002", 10),
} as const satisfies MissionDefinitionCatalog;

const CONTEXT = {
  identityId: "identity.mage",
  faithId: "faith.god",
  enabledModuleIds: [],
  availableContentIds: [],
  worldStateKeys: [],
} as const;

describe("selectMissionCandidate", () => {
  it("使用使命专属随机流在合法候选中按基础权重抽取", () => {
    const result = selectMissionCandidate({
      catalog: CATALOG,
      type: "free",
      context: CONTEXT,
      randomStream: createMissionStream(),
    });

    expect(["mission_000001", "mission_000002"]).toContain(result.missionId);
  });

  it("在重塑或替换时排除指定使命资源", () => {
    const result = selectMissionCandidate({
      catalog: CATALOG,
      type: "free",
      context: CONTEXT,
      randomStream: createMissionStream(),
      excludedMissionIds: ["mission_000002"],
    });

    expect(result.missionId).toBe("mission_000001");
  });
});

/** 创建使命生成测试使用的独立随机流。 */
function createMissionStream(): RandomStream {
  return RandomStream.create("mission", "mission-test", createRandomStreamSeed("0123456789abcdef"));
}

/** 创建使命抽取测试所需的最小自由使命定义。 */
function createMission(missionId: string, baseWeight: number) {
  return {
    missionId,
    name: `Mission ${missionId}`,
    description: `Complete ${missionId}.`,
    type: "free",
    progressKey: "trade",
    requiredProgress: 1,
    difficulty: "standard",
    baseWeight,
    eligibility: {
      identityIds: [],
      faithIds: [],
      requiredModuleIds: [],
      requiredContentIds: [],
      requiredWorldStateKeys: [],
    },
    gameplayTags: ["trade"],
    conflictTags: [],
    replacementGroupId: "free-group",
  } as const;
}
