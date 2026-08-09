import { describe, expect, it } from "vitest";

import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";

import { selectReincarnationSpawn } from "./reincarnation-spawn.ts";

describe("reincarnation spawn selection", () => {
  it("从地图提供的安全聚落候选中使用轮回随机流选择出生点", () => {
    const candidate = selectReincarnationSpawn(
      [
        { spawnId: "spawn-town", settlementType: "TOWN" },
        { spawnId: "spawn-village", settlementType: "VILLAGE" },
      ],
      RandomStream.create("reincarnation", null, createRandomStreamSeed("0123456789abcdef")),
    );

    expect(["spawn-town", "spawn-village"]).toContain(candidate.spawnId);
  });
});
