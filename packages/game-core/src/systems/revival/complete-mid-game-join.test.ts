import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";

import { completeMidGameJoin } from "./complete-mid-game-join.ts";

describe("complete mid-game join", () => {
  it("保留正常初始资源并在安全聚落等待下一轮行动", () => {
    const resources = {
      playerId: "player_b" as PlayerId,
      resources: {
        health: { current: 100, minimum: 0, maximum: 100 },
        spirit: { current: 50, minimum: 0, maximum: 50 },
      },
    };
    const result = completeMidGameJoin<"health" | "spirit">(
      {
        participantId: "player_b",
        status: "REINCARNATED",
        remainingWaitTurns: 0,
        failedAttemptCount: 0,
        lastAttemptTurn: 12,
      },
      resources,
      [{ spawnId: "spawn-village", settlementType: "VILLAGE" }],
      RandomStream.create("reincarnation", null, createRandomStreamSeed("0123456789abcdef")),
    );

    expect(result).toEqual({
      spawn: { spawnId: "spawn-village", settlementType: "VILLAGE" },
      resources,
      protection: { participantId: "player_b", remainingTurns: 3 },
      joinsAtNextRound: true,
    });
  });
});
