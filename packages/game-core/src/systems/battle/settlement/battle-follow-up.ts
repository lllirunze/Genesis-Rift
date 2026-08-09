import type { BattleSettlement } from "./battle-settlement.ts";

/** 声明战斗结算允许通知的下游业务系统。 */
export const BATTLE_FOLLOW_UP_TYPES = ["LOG", "QUEST", "MISSION", "SURVIVAL", "REWARD"] as const;

/** 描述当前模块对外公开的战斗后续处理分类。 */
export type BattleFollowUpType = (typeof BATTLE_FOLLOW_UP_TYPES)[number];

/** 描述一次战斗结算需要交给下游系统处理的中立通知。 */
export interface BattleFollowUpInstruction {
  readonly type: BattleFollowUpType;
  readonly settlementId: string;
  readonly attackId: string;
  readonly attackerId: string;
  readonly defenderId: string;
}

/**
 * 方法名：createBattleFollowUpInstructions
 * 作用：根据唯一战斗结算生成日志、任务、使命、生存与奖励系统可消费的后续通知。
 * @param settlement 已完成且已确定唯一性的战斗结算结果。
 * @returns 按固定顺序排列的不可变后续处理通知列表。
 */
export function createBattleFollowUpInstructions(
  settlement: BattleSettlement,
): readonly BattleFollowUpInstruction[] {
  const baseInstruction = {
    settlementId: settlement.settlementId,
    attackId: settlement.attack.context.attackId,
    attackerId: settlement.attack.context.attackerId,
    defenderId: settlement.attack.context.defenderId,
  };
  const instructions: BattleFollowUpInstruction[] = [
    { ...baseInstruction, type: "LOG" },
    { ...baseInstruction, type: "QUEST" },
    { ...baseInstruction, type: "MISSION" },
  ];

  if (settlement.survivalTransition === "ENTERED_DOWNED") {
    instructions.push({ ...baseInstruction, type: "SURVIVAL" });
  }

  if (settlement.defenderSurvival.status === "DEAD") {
    instructions.push({ ...baseInstruction, type: "REWARD" });
  }

  return Object.freeze(instructions.map((instruction) => Object.freeze(instruction)));
}
