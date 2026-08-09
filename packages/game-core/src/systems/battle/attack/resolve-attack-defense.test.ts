import { describe, expect, it } from "vitest";

import { resolveAttackDefenseResponses } from "./resolve-attack-defense.ts";

describe("attack defense responses", () => {
  it("aggregates defense modifiers in submission order", () => {
    expect(
      resolveAttackDefenseResponses([
        { responseId: "response.001", type: "MODIFY_EVASION", amount: 10 },
        { responseId: "response.002", type: "MODIFY_ATTACK_VALUE", amount: -4 },
        { responseId: "response.003", type: "GRANT_SHIELD", amount: 6 },
      ]),
    ).toEqual({
      cancelled: false,
      evasionRateModifier: 10,
      attackValueModifier: -4,
      shieldGranted: 6,
      resolvedResponseIds: ["response.001", "response.002", "response.003"],
    });
  });

  it("stops resolving responses after an attack is cancelled", () => {
    expect(
      resolveAttackDefenseResponses([
        { responseId: "response.001", type: "GRANT_SHIELD", amount: 4 },
        { responseId: "response.002", type: "CANCEL" },
        { responseId: "response.003", type: "MODIFY_EVASION", amount: 10 },
      ]),
    ).toEqual({
      cancelled: true,
      evasionRateModifier: 0,
      attackValueModifier: 0,
      shieldGranted: 4,
      resolvedResponseIds: ["response.001", "response.002"],
    });
  });

  it("rejects duplicate response ids and invalid amounts", () => {
    expect(() =>
      resolveAttackDefenseResponses([
        { responseId: "response.001", type: "MODIFY_EVASION", amount: 1 },
        { responseId: "response.001", type: "GRANT_SHIELD", amount: 1 },
      ]),
    ).toThrow("Duplicate defense response id");
    expect(() =>
      resolveAttackDefenseResponses([
        { responseId: "response.002", type: "MODIFY_ATTACK_VALUE", amount: 0 },
      ]),
    ).toThrow("must not be zero");
  });
});
