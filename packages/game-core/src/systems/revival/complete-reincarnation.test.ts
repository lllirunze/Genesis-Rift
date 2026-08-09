import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";
import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";

import { completeReincarnation } from "./complete-reincarnation.ts";

describe("complete reincarnation", () => {
  it("为已轮回成功角色选择安全聚落、恢复资源并添加三回合保护", () => {
    const result = completeReincarnation<"health" | "spirit">(
      {
        participantId: "player_a",
        status: "REINCARNATED",
        remainingWaitTurns: 0,
        failedAttemptCount: 0,
        lastAttemptTurn: 10,
      },
      {
        playerId: "player_a" as PlayerId,
        resources: {
          health: { current: 0, minimum: 0, maximum: 100 },
          spirit: { current: 0, minimum: 0, maximum: 50 },
        },
      },
      "health",
      [{ spawnId: "spawn-town", settlementType: "TOWN" }],
      RandomStream.create("reincarnation", null, createRandomStreamSeed("0123456789abcdef")),
    );

    expect(result).toEqual({
      spawn: { spawnId: "spawn-town", settlementType: "TOWN" },
      resources: {
        playerId: "player_a",
        resources: {
          health: { current: 50, minimum: 0, maximum: 100 },
          spirit: { current: 15, minimum: 0, maximum: 50 },
        },
      },
      protection: { participantId: "player_a", remainingTurns: 3 },
    });
  });
});
