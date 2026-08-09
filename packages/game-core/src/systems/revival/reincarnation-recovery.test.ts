import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import { restoreCharacterResourcesAfterReincarnation } from "./reincarnation-recovery.ts";

describe("reincarnation resource recovery", () => {
  it("以整数方式恢复一半生命与三成其他资源", () => {
    const result = restoreCharacterResourcesAfterReincarnation<"health" | "spirit">(
      {
        playerId: "player_a" as PlayerId,
        resources: {
          health: { current: 0, minimum: 0, maximum: 101 },
          spirit: { current: 0, minimum: 0, maximum: 99 },
        },
      },
      "health",
    );

    expect(result.resources).toEqual({
      health: { current: 50, minimum: 0, maximum: 101 },
      spirit: { current: 29, minimum: 0, maximum: 99 },
    });
  });

  it("最大生命值为一时仍至少恢复一点生命", () => {
    const result = restoreCharacterResourcesAfterReincarnation<"health">(
      {
        playerId: "player_a" as PlayerId,
        resources: { health: { current: 0, minimum: 0, maximum: 1 } },
      },
      "health",
    );

    expect(result.resources.health.current).toBe(1);
  });
});
