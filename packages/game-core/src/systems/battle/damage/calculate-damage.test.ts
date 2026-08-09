import { describe, expect, it } from "vitest";

import { calculateAttackValue } from "./calculate-attack-value.ts";
import { calculateBaseDamage } from "./calculate-base-damage.ts";
import { calculateCriticalDamage } from "./calculate-critical-damage.ts";
import { calculateDamage } from "./calculate-damage.ts";
import { calculateEffectiveDefense } from "./calculate-effective-defense.ts";

describe("battle damage calculation", () => {
  it("reproduces the documented physical damage example without a critical strike", () => {
    expect(
      calculateDamage({
        damageType: "PHYSICAL",
        characterAttack: 18,
        weaponAttack: 12,
        attackModifier: 0,
        targetDefense: 10,
        penetration: 3,
        minimumDamageEnabled: true,
        critical: { enabled: true, triggered: false, damagePercent: 150 },
      }),
    ).toEqual({
      damageType: "PHYSICAL",
      attackValue: 30,
      effectiveDefense: 7,
      baseDamage: 23,
      criticalEnabled: true,
      criticalTriggered: false,
      criticalDamagePercent: 150,
      finalDamage: 23,
    });
  });

  it("uses integer multiplication before division for critical damage", () => {
    const result = calculateDamage({
      damageType: "MAGICAL",
      characterAttack: 18,
      weaponAttack: 12,
      attackModifier: 0,
      targetDefense: 10,
      penetration: 1,
      minimumDamageEnabled: true,
      critical: { enabled: true, triggered: true, damagePercent: 150 },
    });

    expect(result).toMatchObject({
      attackValue: 30,
      effectiveDefense: 9,
      baseDamage: 21,
      criticalTriggered: true,
      finalDamage: 31,
    });
  });

  it("applies minimum damage only when the legal attack value is greater than zero", () => {
    expect(calculateBaseDamage(5, 20, true)).toBe(1);
    expect(calculateBaseDamage(5, 20, false)).toBe(0);
    expect(calculateBaseDamage(0, 20, true)).toBe(0);
  });

  it("clamps negative attack totals and overflowing penetration at zero", () => {
    expect(calculateAttackValue(3, 2, -10)).toBe(0);
    expect(calculateEffectiveDefense(5, 8)).toBe(0);
  });

  it("lets true damage bypass defense and disables critical by default input", () => {
    expect(
      calculateDamage({
        damageType: "TRUE",
        providedDamage: 9,
        critical: { enabled: false, triggered: false, damagePercent: 100 },
      }),
    ).toEqual({
      damageType: "TRUE",
      attackValue: 9,
      effectiveDefense: 0,
      baseDamage: 9,
      criticalEnabled: false,
      criticalTriggered: false,
      criticalDamagePercent: 100,
      finalDamage: 9,
    });
  });

  it("normalizes critical damage percentages below one hundred percent", () => {
    expect(
      calculateCriticalDamage(10, {
        enabled: true,
        triggered: true,
        damagePercent: 80,
      }),
    ).toEqual({
      criticalEnabled: true,
      criticalTriggered: true,
      criticalDamagePercent: 100,
      damage: 10,
    });
  });

  it("rejects decimals, negative values and contradictory critical input", () => {
    expect(() => calculateAttackValue(1.5, 0, 0)).toThrow("non-negative safe integer");
    expect(() => calculateEffectiveDefense(-1, 0)).toThrow("non-negative safe integer");
    expect(() =>
      calculateCriticalDamage(10, {
        enabled: false,
        triggered: true,
        damagePercent: 150,
      }),
    ).toThrow("cannot trigger when critical is disabled");
  });

  it("rejects formula results that exceed the safe integer range", () => {
    expect(() => calculateAttackValue(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)).toThrow(
      "exceeds the safe integer range",
    );
    expect(() =>
      calculateCriticalDamage(Number.MAX_SAFE_INTEGER, {
        enabled: true,
        triggered: true,
        damagePercent: 200,
      }),
    ).toThrow("exceeds the safe integer range");
  });
});
