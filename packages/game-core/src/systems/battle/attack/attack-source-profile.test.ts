import { describe, expect, it } from "vitest";

import { prepareAttackSource } from "./attack-source-profile.ts";

describe("prepareAttackSource", () => {
  it("将技能攻击统一转换为基础攻击流程所需的数据", () => {
    const prepared = prepareAttackSource(
      {
        attackId: "attack_runtime_1",
        parentFlowId: null,
        attackerId: "player_a",
        defenderId: "player_b",
        actionConsumed: true,
        movementPointsConsumed: 3,
      },
      {
        sourceType: "skill",
        sourceId: "skill_000001",
        evasionEnabled: false,
        resourceCosts: [{ resourceId: "spirit", amount: 2 }],
        damage: {
          damageType: "MAGICAL",
          characterAttack: 8,
          weaponAttack: 0,
          attackModifier: 5,
          targetDefense: 0,
          penetration: 0,
          minimumDamageEnabled: true,
          critical: { enabled: false, triggered: false, damagePercent: 150 },
        },
      },
    );

    expect(prepared.context).toMatchObject({
      sourceType: "skill",
      sourceId: "skill_000001",
      damageType: "MAGICAL",
    });
    expect(prepared.evasionEnabled).toBe(false);
    expect(prepared.resourceCosts).toEqual([{ resourceId: "spirit", amount: 2 }]);
  });

  it("拒绝为普通攻击配置资源来源标识", () => {
    expect(() =>
      prepareAttackSource(
        {
          attackId: "attack_runtime_2",
          parentFlowId: null,
          attackerId: "player_a",
          defenderId: "player_b",
          actionConsumed: true,
          movementPointsConsumed: 0,
        },
        {
          sourceType: "normal",
          sourceId: "equip_000001",
          evasionEnabled: true,
          resourceCosts: [],
          damage: {
            damageType: "TRUE",
            providedDamage: 1,
            critical: { enabled: false, triggered: false, damagePercent: 150 },
          },
        },
      ),
    ).toThrow("Normal attacks must not have a source id");
  });
});
