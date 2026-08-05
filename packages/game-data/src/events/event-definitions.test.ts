import { validateEventDefinitionCatalog } from "@genesis-rift/game-core";
import { describe, expect, it } from "vitest";

import {
  ABANDONED_CAMP_EVENT_DEFINITION,
  ANCIENT_RUINS_EVENT_DEFINITION,
  BLIZZARD_EVENT_DEFINITION,
  EVENT_DEFINITION_CATALOG,
  WILD_BEAST_ATTACK_EVENT_DEFINITION,
} from "./event-definitions.ts";

describe("event definitions", () => {
  it("provides valid and uniquely identified event configurations", () => {
    expect(() => validateEventDefinitionCatalog(EVENT_DEFINITION_CATALOG)).not.toThrow();
    expect(Object.keys(EVENT_DEFINITION_CATALOG)).toEqual([
      "event.common.abandoned-camp",
      "event.encounter.wild-beast-attack",
      "event.adventure.ancient-ruins",
      "event.disaster.blizzard",
    ]);
  });

  it("covers forced and optional reveal modes", () => {
    expect(ABANDONED_CAMP_EVENT_DEFINITION.revealMode).toBe("FORCED");
    expect(ANCIENT_RUINS_EVENT_DEFINITION.revealMode).toBe("OPTIONAL");
  });

  it("covers direct and choice event resolutions", () => {
    expect(ABANDONED_CAMP_EVENT_DEFINITION.resolution.type).toBe("CHOICE");
    expect(ANCIENT_RUINS_EVENT_DEFINITION.resolution.type).toBe("CHOICE");
    expect(WILD_BEAST_ATTACK_EVENT_DEFINITION.resolution.type).toBe("DIRECT");
    expect(BLIZZARD_EVENT_DEFINITION.resolution.type).toBe("DIRECT");
  });

  it("covers immediate and fixed-round durations", () => {
    expect(ABANDONED_CAMP_EVENT_DEFINITION.duration.type).toBe("IMMEDIATE");
    expect(BLIZZARD_EVENT_DEFINITION.duration).toEqual({
      type: "FIXED_ROUNDS",
      rounds: 3,
      updateTiming: "ROUND_END",
      repeat: { policy: "IGNORE" },
    });
  });

  it("uses random item pools for rewards whose exact item is not predetermined", () => {
    if (ANCIENT_RUINS_EVENT_DEFINITION.resolution.type !== "CHOICE") {
      throw new Error("Ancient Ruins must be a choice event");
    }

    const effectIds = ANCIENT_RUINS_EVENT_DEFINITION.resolution.options.flatMap((option) =>
      option.effects.map((effect) => effect.effectId),
    );

    expect(effectIds).toEqual(["item.obtainFromPool", "item.obtainFromPool"]);
  });
});
