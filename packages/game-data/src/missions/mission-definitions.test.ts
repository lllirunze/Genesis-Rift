import { describe, expect, it } from "vitest";

import { generateMissionSet, validateMissionDefinitionCatalog } from "@genesis-rift/game-core";
import { createRandomStreamSeed, RandomStream } from "@genesis-rift/game-core";

import { MISSION_DEFINITION_CATALOG } from "./mission-definitions.ts";

describe("MISSION_DEFINITION_CATALOG", () => {
  it("符合使命资源规范，并可为法师生成五类各一项的隐藏使命", () => {
    validateMissionDefinitionCatalog(MISSION_DEFINITION_CATALOG);
    const result = generateMissionSet({
      catalog: MISSION_DEFINITION_CATALOG,
      context: {
        identityId: "identity.mage",
        faithId: "faith.default",
        enabledModuleIds: [],
        availableContentIds: [],
        worldStateKeys: [],
      },
      randomStream: RandomStream.create(
        "mission",
        "mission-data-test",
        createRandomStreamSeed("0123456789abcdef"),
      ),
    });

    expect(result.missions.map((mission) => mission.type)).toEqual([
      "identity",
      "faith",
      "growth",
      "world",
      "free",
    ]);
  });
});
