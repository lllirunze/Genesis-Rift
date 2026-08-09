import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import type { CharacterResourceState } from "../../character/index.ts";

import {
  createActiveCharacterSurvivalState,
  enterDownedIfNeeded,
} from "./character-survival-state.ts";
import { recoverCharacterFromDowned, settleCharacterDamage } from "./settle-character-vitals.ts";

const PLAYER_ID = "player_a" as PlayerId;

function createResourceState(health: number): CharacterResourceState<"health" | "mana"> {
  return {
    playerId: PLAYER_ID,
    resources: {
      health: { current: health, minimum: 0, maximum: 30 },
      mana: { current: 12, minimum: 0, maximum: 20 },
    },
  };
}

describe("settleCharacterDamage", () => {
  it("按护盾、生命和击倒的顺序同步角色运行时状态", () => {
    const result = settleCharacterDamage({
      resources: createResourceState(10),
      healthResourceId: "health",
      currentShield: 4,
      survival: createActiveCharacterSurvivalState(PLAYER_ID),
      damage: { damageType: "PHYSICAL", finalDamage: 14, shieldCanAbsorb: true },
    });

    expect(result.vitals).toMatchObject({ shieldAbsorbed: 4, damageToHealth: 10, healthAfter: 0 });
    expect(result.resources.resources.health.current).toBe(0);
    expect(result.currentShield).toBe(0);
    expect(result.survivalTransition).toBe("ENTERED_DOWNED");
    expect(result.survival).toMatchObject({ status: "DOWNED", downedTurnsRemaining: 3 });
  });

  it("允许护盾无法吸收的伤害直接扣除生命", () => {
    const result = settleCharacterDamage({
      resources: createResourceState(10),
      healthResourceId: "health",
      currentShield: 8,
      survival: createActiveCharacterSurvivalState(PLAYER_ID),
      damage: { damageType: "TRUE", finalDamage: 3, shieldCanAbsorb: false },
    });

    expect(result.currentShield).toBe(8);
    expect(result.resources.resources.health.current).toBe(7);
    expect(result.survival.status).toBe("ACTIVE");
  });
});

describe("recoverCharacterFromDowned", () => {
  it("让自救与队友救援共用同一生命恢复和解除击倒流程", () => {
    const downed = enterDownedIfNeeded(createActiveCharacterSurvivalState(PLAYER_ID), true).state;
    const result = recoverCharacterFromDowned({
      resources: createResourceState(0),
      healthResourceId: "health",
      survival: downed,
      recoveredHealth: 7,
    });

    expect(result.resources.resources.health.current).toBe(7);
    expect(result.restoredHealth).toBe(7);
    expect(result.survival).toEqual({
      participantId: PLAYER_ID,
      status: "ACTIVE",
      downedTurnsRemaining: 0,
    });
  });

  it("拒绝跨角色同步生命与生存状态", () => {
    expect(() =>
      settleCharacterDamage({
        resources: createResourceState(10),
        healthResourceId: "health",
        currentShield: 0,
        survival: createActiveCharacterSurvivalState("player_b"),
        damage: { damageType: "PHYSICAL", finalDamage: 1, shieldCanAbsorb: true },
      }),
    ).toThrow("same participant");
  });
});
