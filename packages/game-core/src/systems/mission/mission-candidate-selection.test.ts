import { describe, expect, it } from "vitest";

import type { MissionDefinitionCatalog } from "./mission-definition.ts";
import { collectMissionCandidates } from "./mission-candidate-selection.ts";

const CATALOG = {
  mission_000001: createMission("mission_000001", {
    identityIds: ["identity.mage"],
    faithIds: ["faith.god"],
    requiredModuleIds: ["event"],
    requiredContentIds: ["region_000001"],
    requiredWorldStateKeys: ["mountainOpen"],
  }),
  mission_000002: createMission("mission_000002", {
    identityIds: [],
    faithIds: [],
    requiredModuleIds: [],
    requiredContentIds: [],
    requiredWorldStateKeys: [],
  }),
  mission_000003: {
    ...createMission("mission_000003", {
      identityIds: [],
      faithIds: [],
      requiredModuleIds: [],
      requiredContentIds: [],
      requiredWorldStateKeys: [],
    }),
    baseWeight: 0,
  },
} as const satisfies MissionDefinitionCatalog;

describe("collectMissionCandidates", () => {
  it("仅返回满足身份、信仰、模块、内容和世界状态全部条件的同类型使命", () => {
    const candidates = collectMissionCandidates(CATALOG, "world", {
      identityId: "identity.mage",
      faithId: "faith.god",
      enabledModuleIds: ["event", "map"],
      availableContentIds: ["region_000001"],
      worldStateKeys: ["mountainOpen"],
    });

    expect(candidates.map((candidate) => candidate.missionId)).toEqual([
      "mission_000001",
      "mission_000002",
    ]);
  });

  it("排除尚未满足世界内容条件和基础权重为零的使命", () => {
    const candidates = collectMissionCandidates(CATALOG, "world", {
      identityId: "identity.mage",
      faithId: "faith.god",
      enabledModuleIds: ["event"],
      availableContentIds: [],
      worldStateKeys: [],
    });

    expect(candidates.map((candidate) => candidate.missionId)).toEqual(["mission_000002"]);
  });
});

/** 创建候选筛选测试所需的最小世界使命定义。 */
function createMission(
  missionId: string,
  eligibility: {
    readonly identityIds: readonly string[];
    readonly faithIds: readonly string[];
    readonly requiredModuleIds: readonly string[];
    readonly requiredContentIds: readonly string[];
    readonly requiredWorldStateKeys: readonly string[];
  },
) {
  return {
    missionId,
    name: `Mission ${missionId}`,
    description: `Complete ${missionId}.`,
    type: "world",
    progressKey: "explore",
    requiredProgress: 1,
    difficulty: "standard",
    baseWeight: 1,
    eligibility,
    gameplayTags: ["explore"],
    conflictTags: [],
    replacementGroupId: "world-group",
  } as const;
}
