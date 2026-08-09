import { evaluateAttackEligibility, type AttackEligibilityInput } from "../attack/index.ts";
import { canCharacterPerformAttack, type CharacterSurvivalState } from "../survival/index.ts";

/** 描述战斗参与者当前所属的公开阵营。 */
export const BATTLE_FACTIONS = ["PLAYER", "NPC", "NEUTRAL"] as const;

/** 描述战斗参与者所属阵营。 */
export type BattleFaction = (typeof BATTLE_FACTIONS)[number];

/** 描述一名可参与攻击、受击或结算的战斗单位。 */
export interface BattleParticipantState {
  readonly participantId: string;
  readonly faction: BattleFaction;
  readonly survival: CharacterSurvivalState;
}

/** 描述战斗参与者的固定行动顺序。 */
export interface BattleTurnOrderState {
  readonly participantIds: readonly string[];
  readonly currentIndex: number;
}

/** 描述由地图、回合与资源模块提供的攻击资格外部事实。 */
export interface BattleParticipantAttackFacts {
  readonly hasActionPermission: boolean;
  readonly targetIsVisible: boolean;
  readonly targetIsInRange: boolean;
  readonly resourcesAreSufficient: boolean;
  readonly mapAllowsAttack: boolean;
}

/**
 * 方法名：createBattleParticipantState
 * 作用：创建并校验与生存状态绑定的最小战斗参与者状态。
 * @param participantId 参与者唯一运行时标识。
 * @param faction 参与者公开阵营。
 * @param survival 参与者当前生存状态。
 * @returns 可用于攻击资格与结算的不可变参与者状态。
 * @throws 标识、阵营或生存状态归属不一致时抛出错误。
 */
export function createBattleParticipantState(
  participantId: string,
  faction: BattleFaction,
  survival: CharacterSurvivalState,
): BattleParticipantState {
  assertNonEmptyString(participantId, "participantId");

  if (!BATTLE_FACTIONS.includes(faction)) {
    throw new RangeError(`Unsupported battle faction: ${faction}`);
  }

  if (survival.participantId !== participantId) {
    throw new Error("Battle participant and survival state must use the same participant id");
  }

  return Object.freeze({ participantId, faction, survival });
}

/**
 * 方法名：createBattleTurnOrderState
 * 作用：创建固定且可循环推进的战斗参与者行动顺序。
 * @param participantIds 已排序且不重复的参与者标识。
 * @param currentIndex 当前行动者在顺序中的索引，默认从首位开始。
 * @returns 不可变的战斗行动顺序状态。
 * @throws 顺序为空、标识重复或索引越界时抛出错误。
 */
export function createBattleTurnOrderState(
  participantIds: readonly string[],
  currentIndex: number = 0,
): BattleTurnOrderState {
  if (participantIds.length === 0) {
    throw new Error("Battle turn order must contain at least one participant");
  }

  const knownIds = new Set<string>();
  for (const participantId of participantIds) {
    assertNonEmptyString(participantId, "participantIds");
    if (knownIds.has(participantId)) {
      throw new Error(`Duplicate battle participant in turn order: ${participantId}`);
    }
    knownIds.add(participantId);
  }

  if (
    !Number.isSafeInteger(currentIndex) ||
    currentIndex < 0 ||
    currentIndex >= participantIds.length
  ) {
    throw new RangeError("currentIndex must reference a battle participant");
  }

  return Object.freeze({ participantIds: Object.freeze([...participantIds]), currentIndex });
}

/**
 * 方法名：advanceBattleTurnOrder
 * 作用：推进到顺序中的下一名参与者，并在末尾循环回首位。
 * @param state 当前战斗行动顺序状态。
 * @returns 下一个行动者对应的新顺序状态。
 * @throws 当前顺序状态不合法时抛出错误。
 */
export function advanceBattleTurnOrder(state: BattleTurnOrderState): BattleTurnOrderState {
  const validated = createBattleTurnOrderState(state.participantIds, state.currentIndex);
  const currentIndex = (validated.currentIndex + 1) % validated.participantIds.length;
  return Object.freeze({ ...validated, currentIndex });
}

/**
 * 方法名：getCurrentBattleParticipantId
 * 作用：读取当前应当行动的战斗参与者标识。
 * @param state 当前战斗行动顺序状态。
 * @returns 当前行动者的参与者标识。
 * @throws 当前顺序状态不合法时抛出错误。
 */
export function getCurrentBattleParticipantId(state: BattleTurnOrderState): string {
  const validated = createBattleTurnOrderState(state.participantIds, state.currentIndex);
  return validated.participantIds[validated.currentIndex]!;
}

/**
 * 方法名：createBattleAttackEligibilityInput
 * 作用：将参与者生存状态和阵营关系转换为既有攻击资格检查所需的全部事实。
 * @param attacker 发起攻击的参与者。
 * @param defender 受到攻击的参与者。
 * @param facts 地图、回合和资源系统提供的外部事实。
 * @returns 可直接传入统一攻击资格检查的纯事实对象。
 */
export function createBattleAttackEligibilityInput(
  attacker: BattleParticipantState,
  defender: BattleParticipantState,
  facts: BattleParticipantAttackFacts,
): AttackEligibilityInput {
  return Object.freeze({
    hasActionPermission: facts.hasActionPermission,
    attackerCanAttack: canCharacterPerformAttack(attacker.survival),
    targetIsAttackable:
      attacker.participantId !== defender.participantId &&
      attacker.faction !== defender.faction &&
      defender.survival.status !== "DEAD",
    targetIsVisible: facts.targetIsVisible,
    targetIsInRange: facts.targetIsInRange,
    resourcesAreSufficient: facts.resourcesAreSufficient,
    mapAllowsAttack: facts.mapAllowsAttack,
  });
}

/**
 * 方法名：evaluateBattleParticipantAttackEligibility
 * 作用：使用参与者模型和外部战场事实完成标准攻击资格判断。
 * @param attacker 发起攻击的参与者。
 * @param defender 受到攻击的参与者。
 * @param facts 地图、回合和资源系统提供的外部事实。
 * @returns 既有攻击资格规则返回的允许结果或稳定失败原因。
 */
export function evaluateBattleParticipantAttackEligibility(
  attacker: BattleParticipantState,
  defender: BattleParticipantState,
  facts: BattleParticipantAttackFacts,
) {
  return evaluateAttackEligibility(createBattleAttackEligibilityInput(attacker, defender, facts));
}

/** 校验字符串为非空标识。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
