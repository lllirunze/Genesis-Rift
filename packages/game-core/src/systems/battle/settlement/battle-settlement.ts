import type { AttackResolutionResult } from "../attack/index.ts";
import {
  enterDownedIfNeeded,
  validateCharacterSurvivalState,
  type CharacterSurvivalState,
  type EnterDownedResult,
} from "../survival/index.ts";

/** 描述一次已完成攻击在战斗结算层中的唯一记录。 */
export interface BattleSettlement {
  readonly settlementId: string;
  readonly attack: AttackResolutionResult;
  readonly defenderSurvival: CharacterSurvivalState;
  readonly survivalTransition: EnterDownedResult["outcome"];
}

/** 描述本局已经写入的战斗结算标识，用于避免同一攻击重复派发后续结果。 */
export interface BattleSettlementLedger {
  readonly settledAttackIds: readonly string[];
}

/** 描述写入战斗结算记录后的结果。 */
export type RecordBattleSettlementResult =
  | { readonly outcome: "RECORDED"; readonly ledger: BattleSettlementLedger }
  | { readonly outcome: "DUPLICATE"; readonly ledger: BattleSettlementLedger };

/**
 * 方法名：createBattleSettlement
 * 作用：将一次攻击结算转换为目标角色的生命状态变化，不直接发放奖励或推进任务。
 * @param settlementId 本次战斗结算的唯一运行时标识。
 * @param attack 已完成的基础攻击结算结果。
 * @param defenderSurvival 攻击结算前目标角色的生存状态。
 * @returns 记录攻击结果与目标生存状态变化的不可变结算对象。
 * @throws 标识为空、攻击与目标生存状态参与者不一致时抛出错误。
 */
export function createBattleSettlement(
  settlementId: string,
  attack: AttackResolutionResult,
  defenderSurvival: CharacterSurvivalState,
): BattleSettlement {
  assertNonEmptyString(settlementId, "settlementId");
  validateCharacterSurvivalState(defenderSurvival);

  if (attack.context.defenderId !== defenderSurvival.participantId) {
    throw new Error("Attack defender must match the survival-state participant");
  }

  const survival = enterDownedIfNeeded(defenderSurvival, attack.vitals?.healthDepleted ?? false);

  return Object.freeze({
    settlementId,
    attack,
    defenderSurvival: survival.state,
    survivalTransition: survival.outcome,
  });
}

/**
 * 方法名：createBattleSettlementLedger
 * 作用：创建不包含任何已处理攻击的初始战斗结算账本。
 * @returns 可用于幂等判断的不可变空账本。
 */
export function createBattleSettlementLedger(): BattleSettlementLedger {
  return Object.freeze({ settledAttackIds: Object.freeze([]) });
}

/**
 * 方法名：recordBattleSettlement
 * 作用：记录已处理攻击，确保同一攻击不会重复触发奖励、任务或日志通知。
 * @param ledger 当前对局已经处理过的战斗结算账本。
 * @param settlement 需要写入的战斗结算结果。
 * @returns 新账本，或检测到重复攻击时返回原账本。
 * @throws 账本中的攻击标识非法或重复时抛出错误。
 */
export function recordBattleSettlement(
  ledger: BattleSettlementLedger,
  settlement: BattleSettlement,
): RecordBattleSettlementResult {
  validateBattleSettlementLedger(ledger);

  if (ledger.settledAttackIds.includes(settlement.attack.context.attackId)) {
    return Object.freeze({ outcome: "DUPLICATE", ledger });
  }

  return Object.freeze({
    outcome: "RECORDED",
    ledger: Object.freeze({
      settledAttackIds: Object.freeze([
        ...ledger.settledAttackIds,
        settlement.attack.context.attackId,
      ]),
    }),
  });
}

/**
 * 方法名：validateBattleSettlementLedger
 * 作用：校验战斗结算账本中的攻击标识均有效且未重复。
 * @param ledger 需要校验的战斗结算账本。
 * @returns 无返回值。
 * @throws 账本存在空标识或重复攻击标识时抛出错误。
 */
export function validateBattleSettlementLedger(ledger: BattleSettlementLedger): void {
  const attackIds = new Set<string>();

  for (const attackId of ledger.settledAttackIds) {
    assertNonEmptyString(attackId, "ledger.settledAttackIds");

    if (attackIds.has(attackId)) {
      throw new Error(`Duplicate settled attack id: ${attackId}`);
    }

    attackIds.add(attackId);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是非空字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是非空字符串时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
