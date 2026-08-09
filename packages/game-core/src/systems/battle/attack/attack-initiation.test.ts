import { describe, expect, it } from "vitest";

import { evaluateAttackEligibility } from "./attack-eligibility.ts";
import { commitAttackInitiation } from "./commit-attack-initiation.ts";

const ELIGIBLE_INPUT = {
  hasActionPermission: true,
  attackerCanAttack: true,
  targetIsAttackable: true,
  targetIsVisible: true,
  targetIsInRange: true,
  resourcesAreSufficient: true,
  mapAllowsAttack: true,
} as const;

describe("attack eligibility and initiation", () => {
  it("returns the first stable reason that prevents an attack", () => {
    expect(
      evaluateAttackEligibility({
        ...ELIGIBLE_INPUT,
        hasActionPermission: false,
        targetIsVisible: false,
      }),
    ).toEqual({ allowed: false, reason: "NO_ACTION_PERMISSION" });

    expect(evaluateAttackEligibility({ ...ELIGIBLE_INPUT, targetIsInRange: false })).toEqual({
      allowed: false,
      reason: "OUT_OF_RANGE",
    });
  });

  it("commits action, movement and resource costs only after eligibility succeeds", () => {
    const result = commitAttackInitiation(
      {
        primaryActionAvailable: true,
        remainingMovementPoints: 3,
        resources: { mana: 5, ammunition: 2 },
      },
      evaluateAttackEligibility(ELIGIBLE_INPUT),
      [
        { resourceId: "mana", amount: 2 },
        { resourceId: "ammunition", amount: 1 },
      ],
    );

    expect(result).toEqual({
      state: {
        primaryActionAvailable: false,
        remainingMovementPoints: 0,
        resources: { mana: 3, ammunition: 1 },
      },
      actionConsumed: true,
      movementPointsConsumed: 3,
      resourceCosts: [
        { resourceId: "mana", amount: 2 },
        { resourceId: "ammunition", amount: 1 },
      ],
    });
  });

  it("does not partially spend resources when one cost is insufficient", () => {
    const state = {
      primaryActionAvailable: true,
      remainingMovementPoints: 2,
      resources: { mana: 1, ammunition: 1 },
    } as const;

    expect(() =>
      commitAttackInitiation(state, evaluateAttackEligibility(ELIGIBLE_INPUT), [
        { resourceId: "mana", amount: 1 },
        { resourceId: "ammunition", amount: 2 },
      ]),
    ).toThrow("Insufficient attack resource ammunition");
    expect(state).toEqual({
      primaryActionAvailable: true,
      remainingMovementPoints: 2,
      resources: { mana: 1, ammunition: 1 },
    });
  });

  it("rejects attempts to commit an ineligible attack", () => {
    expect(() =>
      commitAttackInitiation(
        { primaryActionAvailable: true, remainingMovementPoints: 0, resources: {} },
        { allowed: false, reason: "OUT_OF_RANGE" },
        [],
      ),
    ).toThrow("Cannot initiate ineligible attack");
  });
});
