import { describe, expect, it } from "vitest";

import { createRandomStreamSeed } from "../../random/core/random-seed.ts";
import { RandomStream } from "../../random/core/random-stream.ts";
import { createAttackContext, resolveAttack } from "../attack/index.ts";
import { createActiveCharacterSurvivalState } from "../survival/index.ts";

import {
  createBattleSettlement,
  createBattleSettlementLedger,
  recordBattleSettlement,
} from "./battle-settlement.ts";
import { createBattleFollowUpInstructions } from "./battle-follow-up.ts";

function createResolvedAttack(attackId: string, currentHealth: number) {
  return resolveAttack(
    RandomStream.create("combat", null, createRandomStreamSeed("0123456789abcdef")),
    {
      context: createAttackContext({
        attackId,
        parentFlowId: null,
        attackerId: "player_a",
        defenderId: "player_b",
        sourceType: "normal",
        sourceId: null,
        damageType: "PHYSICAL",
        actionConsumed: true,
        movementPointsConsumed: 2,
      }),
      defense: { cancelled: false },
      targetEvasionRate: 0,
      sourceCriticalRate: 0,
      damage: {
        damageType: "PHYSICAL",
        characterAttack: 10,
        weaponAttack: 0,
        attackModifier: 0,
        targetDefense: 0,
        penetration: 0,
        minimumDamageEnabled: true,
        critical: { enabled: false, triggered: false, damagePercent: 150 },
      },
      targetVitals: { currentShield: 0, currentHealth, shieldCanAbsorb: true },
    },
  );
}

describe("createBattleSettlement", () => {
  it("将生命归零的攻击结果转换为击倒状态", () => {
    const settlement = createBattleSettlement(
      "battle-settlement-a",
      createResolvedAttack("attack-a", 5),
      createActiveCharacterSurvivalState("player_b"),
    );

    expect(settlement.survivalTransition).toBe("ENTERED_DOWNED");
    expect(settlement.defenderSurvival).toMatchObject({
      status: "DOWNED",
      downedTurnsRemaining: 3,
    });
  });

  it("记录同一攻击时返回重复结果，避免重复派发后续业务", () => {
    const settlement = createBattleSettlement(
      "battle-settlement-b",
      createResolvedAttack("attack-b", 50),
      createActiveCharacterSurvivalState("player_b"),
    );
    const recorded = recordBattleSettlement(createBattleSettlementLedger(), settlement);
    const duplicated = recordBattleSettlement(recorded.ledger, settlement);

    expect(recorded.outcome).toBe("RECORDED");
    expect(duplicated.outcome).toBe("DUPLICATE");
    expect(duplicated.ledger).toBe(recorded.ledger);
  });

  it("为已结算攻击生成中立的日志、任务与使命通知", () => {
    const settlement = createBattleSettlement(
      "battle-settlement-c",
      createResolvedAttack("attack-c", 50),
      createActiveCharacterSurvivalState("player_b"),
    );

    expect(
      createBattleFollowUpInstructions(settlement).map((instruction) => instruction.type),
    ).toEqual(["LOG", "QUEST", "MISSION"]);
  });
});
