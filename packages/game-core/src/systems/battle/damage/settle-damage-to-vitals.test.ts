import { describe, expect, it } from "vitest";

import { settleDamageToVitals } from "./settle-damage-to-vitals.ts";

describe("damage settlement to shield and health", () => {
  it("reproduces the documented shield and health settlement example", () => {
    expect(
      settleDamageToVitals({
        damageType: "PHYSICAL",
        finalDamage: 23,
        currentShield: 5,
        currentHealth: 60,
        shieldCanAbsorb: true,
      }),
    ).toEqual({
      damageType: "PHYSICAL",
      finalDamage: 23,
      shieldBefore: 5,
      shieldAbsorbed: 5,
      shieldAfter: 0,
      damageToHealth: 18,
      healthBefore: 60,
      healthAfter: 42,
      overkillDamage: 0,
      healthDepleted: false,
      enteredDowned: false,
    });
  });

  it("records overkill damage and the transition into downed state", () => {
    expect(
      settleDamageToVitals({
        damageType: "MAGICAL",
        finalDamage: 20,
        currentShield: 3,
        currentHealth: 10,
        shieldCanAbsorb: true,
      }),
    ).toMatchObject({
      shieldAbsorbed: 3,
      damageToHealth: 17,
      healthAfter: 0,
      overkillDamage: 7,
      healthDepleted: true,
      enteredDowned: true,
    });
  });

  it("keeps an incompatible shield unchanged when settling true damage", () => {
    expect(
      settleDamageToVitals({
        damageType: "TRUE",
        finalDamage: 8,
        currentShield: 20,
        currentHealth: 30,
        shieldCanAbsorb: false,
      }),
    ).toMatchObject({
      shieldAbsorbed: 0,
      shieldAfter: 20,
      damageToHealth: 8,
      healthAfter: 22,
    });
  });

  it("does not report a second downed transition for a target already at zero health", () => {
    expect(
      settleDamageToVitals({
        damageType: "PHYSICAL",
        finalDamage: 5,
        currentShield: 0,
        currentHealth: 0,
        shieldCanAbsorb: true,
      }),
    ).toMatchObject({
      healthAfter: 0,
      overkillDamage: 5,
      healthDepleted: true,
      enteredDowned: false,
    });
  });

  it("rejects negative, decimal and unsafe runtime values", () => {
    expect(() =>
      settleDamageToVitals({
        damageType: "PHYSICAL",
        finalDamage: -1,
        currentShield: 0,
        currentHealth: 1,
        shieldCanAbsorb: true,
      }),
    ).toThrow("non-negative safe integer");
    expect(() =>
      settleDamageToVitals({
        damageType: "PHYSICAL",
        finalDamage: 1,
        currentShield: 0.5,
        currentHealth: 1,
        shieldCanAbsorb: true,
      }),
    ).toThrow("non-negative safe integer");
  });
});
