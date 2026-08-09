import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../../random/core/random-seed.ts";
import { RandomStream } from "../../random/core/random-stream.ts";
import { createAttackContext, type ResolveAttackInput } from "./attack-definition.ts";
import { resolveAttack } from "./resolve-attack.ts";

const STREAM_SEED = createRandomStreamSeed("0123456789abcdef");

/**
 * 方法名：createCombatStream
 * 作用：创建用于攻击流程测试的确定性战斗随机流。
 * @returns 初始状态一致的战斗随机流。
 */
function createCombatStream(): RandomStream {
  return RandomStream.create("combat", null, STREAM_SEED);
}

/**
 * 方法名：createInput
 * 作用：创建一份可由基础攻击流程结算的默认合法输入。
 * @param overrides 需要覆盖的局部攻击流程输入。
 * @returns 适用于测试的完整基础攻击流程输入。
 */
function createInput(overrides: Partial<ResolveAttackInput> = {}): ResolveAttackInput {
  return {
    context: createAttackContext({
      attackId: "attack.runtime.001",
      parentFlowId: "turn.runtime.001",
      attackerId: "player.a",
      defenderId: "player.b",
      sourceType: "normal",
      sourceId: null,
      damageType: "PHYSICAL",
      actionConsumed: true,
      movementPointsConsumed: 2,
    }),
    defense: { cancelled: false },
    targetEvasionRate: 0,
    sourceCriticalRate: 100,
    damage: {
      damageType: "PHYSICAL",
      characterAttack: 18,
      weaponAttack: 12,
      attackModifier: 0,
      targetDefense: 10,
      penetration: 3,
      minimumDamageEnabled: true,
      critical: { enabled: true, triggered: false, damagePercent: 150 },
    },
    targetVitals: {
      currentShield: 5,
      currentHealth: 60,
      shieldCanAbsorb: true,
    },
    ...overrides,
  };
}

describe("basic attack resolution", () => {
  it("stops immediately when active defense cancels the attack", () => {
    const stream = createCombatStream();
    const result = resolveAttack(stream, createInput({ defense: { cancelled: true } }));

    expect(result).toMatchObject({
      outcome: "CANCELLED",
      evasion: null,
      critical: null,
      damage: null,
      vitals: null,
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("stops before damage and critical checks when the defender evades", () => {
    const stream = createCombatStream();
    const result = resolveAttack(stream, createInput({ targetEvasionRate: 100 }));

    expect(result).toMatchObject({
      outcome: "EVADED",
      evasion: { evaded: true, roll: null },
      critical: null,
      damage: null,
      vitals: null,
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("resolves evasion, damage, critical damage and vitals in order", () => {
    const stream = createCombatStream();
    const result = resolveAttack(stream, createInput());

    expect(result).toMatchObject({
      outcome: "RESOLVED",
      evasion: { evaded: false, roll: null },
      critical: { critical: true, roll: null },
      damage: {
        attackValue: 30,
        effectiveDefense: 7,
        baseDamage: 23,
        finalDamage: 34,
      },
      vitals: {
        shieldAbsorbed: 5,
        damageToHealth: 29,
        healthAfter: 31,
        enteredDowned: false,
      },
    });
    expect(stream.exportState().callCount).toBe(0);
  });

  it("uses the same combat stream for non-boundary evasion and critical checks", () => {
    const stream = createCombatStream();
    const result = resolveAttack(
      stream,
      createInput({ targetEvasionRate: 1, sourceCriticalRate: 35 }),
    );

    expect(result.outcome).toBe("RESOLVED");
    expect(result.evasion?.roll).not.toBeNull();
    expect(result.critical?.roll).not.toBeNull();
    expect(stream.exportState().callCount).toBe(2);
  });

  it("rejects damage type mismatches before consuming random values", () => {
    const stream = createCombatStream();
    const input = createInput({
      context: createAttackContext({
        attackId: "attack.runtime.002",
        parentFlowId: null,
        attackerId: "player.a",
        defenderId: "player.b",
        sourceType: "skill",
        sourceId: "skill_000001",
        damageType: "MAGICAL",
        actionConsumed: true,
        movementPointsConsumed: 0,
      }),
    });

    expect(() => resolveAttack(stream, input)).toThrow("damage type must match");
    expect(stream.exportState().callCount).toBe(0);
  });
});
