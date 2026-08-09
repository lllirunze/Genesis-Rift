import {
  CHARACTER_SURVIVAL_STATUSES,
  DEFAULT_DOWNED_DURATION_TURNS,
  DOWNED_MOVEMENT_POINT_LIMIT,
} from "./survival-config.ts";

/** 描述当前模块对外公开的角色生存状态。 */
export type CharacterSurvivalStatus = (typeof CHARACTER_SURVIVAL_STATUSES)[number];

/** 描述角色在攻击与复活之间需要保存的最小生存状态。 */
export interface CharacterSurvivalState {
  readonly participantId: string;
  readonly status: CharacterSurvivalStatus;
  readonly downedTurnsRemaining: number;
}

/** 描述角色首次进入击倒状态时的处理结果。 */
export type EnterDownedResult =
  | {
      readonly outcome: "ENTERED_DOWNED";
      readonly state: CharacterSurvivalState;
    }
  | {
      readonly outcome: "UNCHANGED";
      readonly state: CharacterSurvivalState;
    };

/** 描述击倒角色在自身回合结束时的倒计时处理结果。 */
export type AdvanceDownedStateResult =
  | {
      readonly outcome: "UNCHANGED";
      readonly state: CharacterSurvivalState;
    }
  | {
      readonly outcome: "DOWNED_TICKED";
      readonly state: CharacterSurvivalState;
    }
  | {
      readonly outcome: "DIED";
      readonly state: CharacterSurvivalState;
    };

/**
 * 方法名：createActiveCharacterSurvivalState
 * 作用：创建处于正常行动状态的角色生存状态。
 * @param participantId 角色、NPC 或其他战斗参与者的运行时标识。
 * @returns 初始为正常行动状态的不可变生存状态。
 * @throws 参与者标识为空时抛出错误。
 */
export function createActiveCharacterSurvivalState(participantId: string): CharacterSurvivalState {
  assertNonEmptyString(participantId, "participantId");
  return Object.freeze({ participantId, status: "ACTIVE", downedTurnsRemaining: 0 });
}

/**
 * 方法名：enterDownedIfNeeded
 * 作用：在生命结算已经确认归零时，将正常角色转换为固定时长的击倒状态。
 * @param state 当前角色生存状态。
 * @param healthDepleted 当前生命是否已经达到零。
 * @param durationTurns 击倒持续的自身回合数，默认使用 V1 标准值。
 * @returns 角色是否首次进入击倒状态及对应的新状态。
 * @throws 状态非法或击倒持续回合数不是正安全整数时抛出错误。
 */
export function enterDownedIfNeeded(
  state: CharacterSurvivalState,
  healthDepleted: boolean,
  durationTurns: number = DEFAULT_DOWNED_DURATION_TURNS,
): EnterDownedResult {
  validateCharacterSurvivalState(state);

  if (typeof healthDepleted !== "boolean") {
    throw new TypeError("healthDepleted must be a boolean");
  }

  assertPositiveSafeInteger(durationTurns, "durationTurns");

  if (!healthDepleted || state.status !== "ACTIVE") {
    return Object.freeze({ outcome: "UNCHANGED", state });
  }

  return Object.freeze({
    outcome: "ENTERED_DOWNED",
    state: Object.freeze({
      participantId: state.participantId,
      status: "DOWNED",
      downedTurnsRemaining: durationTurns,
    }),
  });
}

/**
 * 方法名：advanceDownedStateAtTurnEnd
 * 作用：在击倒角色自身回合结束时减少倒计时，并在归零后转换为正式死亡。
 * @param state 当前角色生存状态。
 * @returns 倒计时未变化、减少或角色死亡后的结构化结果。
 * @throws 角色生存状态不满足状态与倒计时约束时抛出错误。
 */
export function advanceDownedStateAtTurnEnd(
  state: CharacterSurvivalState,
): AdvanceDownedStateResult {
  validateCharacterSurvivalState(state);

  if (state.status !== "DOWNED") {
    return Object.freeze({ outcome: "UNCHANGED", state });
  }

  const downedTurnsRemaining = state.downedTurnsRemaining - 1;

  if (downedTurnsRemaining === 0) {
    return Object.freeze({
      outcome: "DIED",
      state: Object.freeze({
        participantId: state.participantId,
        status: "DEAD",
        downedTurnsRemaining: 0,
      }),
    });
  }

  return Object.freeze({
    outcome: "DOWNED_TICKED",
    state: Object.freeze({ ...state, downedTurnsRemaining }),
  });
}

/**
 * 方法名：recoverDownedCharacter
 * 作用：在自救或他人救援已将生命恢复到正数后解除目标的击倒状态。
 * @param state 当前角色生存状态。
 * @param restoredHealth 救援结算后的当前生命值。
 * @returns 解除击倒后的正常行动状态。
 * @throws 角色并非击倒状态，或恢复后的生命值不为正安全整数时抛出错误。
 */
export function recoverDownedCharacter(
  state: CharacterSurvivalState,
  restoredHealth: number,
): CharacterSurvivalState {
  validateCharacterSurvivalState(state);
  assertPositiveSafeInteger(restoredHealth, "restoredHealth");

  if (state.status !== "DOWNED") {
    throw new Error("Only downed characters can be recovered");
  }

  return Object.freeze({
    participantId: state.participantId,
    status: "ACTIVE",
    downedTurnsRemaining: 0,
  });
}

/**
 * 方法名：canCharacterPerformAttack
 * 作用：判断当前生存状态是否允许角色发起普通攻击或主动攻击技能。
 * @param state 当前角色生存状态。
 * @returns 仅当角色处于正常行动状态时返回 true。
 * @throws 角色生存状态不合法时抛出错误。
 */
export function canCharacterPerformAttack(state: CharacterSurvivalState): boolean {
  validateCharacterSurvivalState(state);
  return state.status === "ACTIVE";
}

/**
 * 方法名：getCharacterMovementPointLimit
 * 作用：根据角色生存状态返回本次行动允许使用的最大普通移动力。
 * @param state 当前角色生存状态。
 * @param normalMovementPointLimit 角色正常状态下可使用的移动力。
 * @returns 正常角色使用原上限，击倒角色最多一格，死亡角色不能移动。
 * @throws 生存状态非法或正常移动力不是非负安全整数时抛出错误。
 */
export function getCharacterMovementPointLimit(
  state: CharacterSurvivalState,
  normalMovementPointLimit: number,
): number {
  validateCharacterSurvivalState(state);
  assertNonNegativeSafeInteger(normalMovementPointLimit, "normalMovementPointLimit");

  if (state.status === "DEAD") {
    return 0;
  }

  if (state.status === "DOWNED") {
    return Math.min(normalMovementPointLimit, DOWNED_MOVEMENT_POINT_LIMIT);
  }

  return normalMovementPointLimit;
}

/**
 * 方法名：validateCharacterSurvivalState
 * 作用：校验角色生存状态、参与者标识和击倒倒计时之间的一致性。
 * @param state 需要校验的角色生存状态。
 * @returns 无返回值。
 * @throws 状态类型或倒计时不符合对应生命周期要求时抛出错误。
 */
export function validateCharacterSurvivalState(state: CharacterSurvivalState): void {
  assertNonEmptyString(state.participantId, "participantId");

  if (!CHARACTER_SURVIVAL_STATUSES.includes(state.status)) {
    throw new RangeError(`Unsupported character survival status: ${state.status}`);
  }

  if (!Number.isSafeInteger(state.downedTurnsRemaining) || state.downedTurnsRemaining < 0) {
    throw new RangeError("downedTurnsRemaining must be a non-negative safe integer");
  }

  if (state.status === "DOWNED" && state.downedTurnsRemaining === 0) {
    throw new Error("Downed characters must have at least one remaining downed turn");
  }

  if (state.status !== "DOWNED" && state.downedTurnsRemaining !== 0) {
    throw new Error("Only downed characters can have remaining downed turns");
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是大于零的安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 输入不是正安全整数时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
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
