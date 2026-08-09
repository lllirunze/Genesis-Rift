import type { PlayerId } from "@genesis-rift/shared";

import {
  MISSION_COMPLETION_COUNT_FOR_VICTORY,
  MISSION_COUNT_PER_PLAYER,
  MISSION_REPLACEMENT_REASONS,
  MISSION_TYPES,
  MISSION_VICTORY_STATUSES,
  type MissionReplacementReason,
  type MissionVictoryStatus,
} from "./mission-config.ts";
import {
  getMissionDefinition,
  validateMissionDefinitionCatalog,
  type MissionDefinitionCatalog,
} from "./mission-definition.ts";

/** 描述单个使命在玩家本局游戏中的私有进度和完成记录。 */
export interface PlayerMissionInstance {
  readonly missionId: string;
  readonly currentProgress: number;
  readonly completedAtTurn: number | null;
  readonly completedSourceId: string | null;
}

/** 描述一次自动使命替换的永久历史记录。 */
export interface MissionReplacementHistoryEntry {
  readonly previousMissionId: string;
  readonly replacementMissionId: string;
  readonly reason: MissionReplacementReason;
  readonly replacedAtTurn: number;
}

/** 描述单名玩家私有、可持久化的全部使命状态。 */
export interface PlayerMissionState {
  readonly ownerId: PlayerId;
  readonly missions: readonly PlayerMissionInstance[];
  readonly replacementHistory: readonly MissionReplacementHistoryEntry[];
  readonly victoryStatus: MissionVictoryStatus;
}

/** 描述外部已确认业务结果向使命系统提交的进度事件。 */
export interface MissionProgressEvent {
  readonly progressKey: string;
  readonly count: number;
  readonly sourceId: string;
}

/**
 * 方法名：createPlayerMissionState
 * 作用：根据已经生成的五个不同类型使命，创建玩家私有且默认隐藏的初始使命状态。
 * @param ownerId 使命状态所属玩家标识。
 * @param missionIds 已通过生成系统选定的五个使命资源标识。
 * @param catalog 静态使命定义注册表。
 * @returns 包含五个零进度使命且尚未进入胜利确认的不可变状态。
 * @throws 使命数量、类型覆盖、资源重复或静态定义不合法时抛出错误。
 */
export function createPlayerMissionState(
  ownerId: PlayerId,
  missionIds: readonly string[],
  catalog: MissionDefinitionCatalog,
): PlayerMissionState {
  assertNonEmptyString(ownerId, "ownerId");
  validateMissionDefinitionCatalog(catalog);
  validateMissionIds(missionIds, catalog);

  return freezeState({
    ownerId,
    missions: missionIds.map((missionId) => ({
      missionId,
      currentProgress: 0,
      completedAtTurn: null,
      completedSourceId: null,
    })),
    replacementHistory: [],
    victoryStatus: "NONE",
  });
}

/**
 * 方法名：applyMissionProgressEvent
 * 作用：根据其他系统已经确认的事实，推进所有匹配进度口径且尚未完成的玩家使命。
 * @param state 当前玩家私有使命状态。
 * @param catalog 静态使命定义注册表。
 * @param event 已确认的进度事件。
 * @param currentTurn 本次事件所属的当前回合编号。
 * @returns 更新后的使命进度；完成三项使命时进入待确认胜利状态。
 * @throws 进度事件、回合编号、状态或静态定义非法时抛出错误。
 */
export function applyMissionProgressEvent(
  state: PlayerMissionState,
  catalog: MissionDefinitionCatalog,
  event: MissionProgressEvent,
  currentTurn: number,
): PlayerMissionState {
  validatePlayerMissionState(state, catalog);
  validateMissionProgressEvent(event);
  assertNonNegativeSafeInteger(currentTurn, "currentTurn");

  const missions = state.missions.map((instance) => {
    if (instance.completedAtTurn !== null) {
      return instance;
    }

    const definition = getMissionDefinition(catalog, instance.missionId);

    if (definition.progressKey !== event.progressKey) {
      return instance;
    }

    const currentProgress = Math.min(
      definition.requiredProgress,
      instance.currentProgress + event.count,
    );
    const completed = currentProgress === definition.requiredProgress;

    return {
      ...instance,
      currentProgress,
      completedAtTurn: completed ? currentTurn : null,
      completedSourceId: completed ? event.sourceId : null,
    };
  });
  const victoryStatus =
    state.victoryStatus === "NONE" &&
    getCompletedMissionCount(missions) >= MISSION_COMPLETION_COUNT_FOR_VICTORY
      ? "PENDING_CONFIRMATION"
      : state.victoryStatus;

  return freezeState({ ...state, missions, victoryStatus });
}

/**
 * 方法名：confirmMissionVictoryAtResolutionEnd
 * 作用：在当前完整结算结束后确认玩家待确认的使命胜利，不会打断触发使命的中间流程。
 * @param state 当前玩家私有使命状态。
 * @param catalog 静态使命定义注册表。
 * @returns 胜利已确认或保持原状态的不可变使命状态。
 * @throws 使命状态或静态定义非法时抛出错误。
 */
export function confirmMissionVictoryAtResolutionEnd(
  state: PlayerMissionState,
  catalog: MissionDefinitionCatalog,
): PlayerMissionState {
  validatePlayerMissionState(state, catalog);

  if (
    state.victoryStatus !== "PENDING_CONFIRMATION" ||
    getCompletedMissionCount(state.missions) < MISSION_COMPLETION_COUNT_FOR_VICTORY
  ) {
    return state;
  }

  return freezeState({ ...state, victoryStatus: "CONFIRMED" });
}

/**
 * 方法名：confirmMissionVictoriesAtResolutionEnd
 * 作用：在同一个完整结算结束时统一确认所有满足条件的玩家，支持多人同时获胜。
 * @param states 同一结算节点内全部需要检查的玩家使命状态。
 * @param catalog 静态使命定义注册表。
 * @returns 更新后的玩家状态和本结算节点确认的全部胜者标识。
 */
export function confirmMissionVictoriesAtResolutionEnd(
  states: readonly PlayerMissionState[],
  catalog: MissionDefinitionCatalog,
): {
  readonly states: readonly PlayerMissionState[];
  readonly winnerIds: readonly PlayerId[];
} {
  const nextStates = states.map((state) => confirmMissionVictoryAtResolutionEnd(state, catalog));
  const winnerIds = nextStates
    .filter((state) => state.victoryStatus === "CONFIRMED")
    .map((state) => state.ownerId);

  return Object.freeze({
    states: Object.freeze(nextStates),
    winnerIds: Object.freeze(winnerIds),
  });
}

/**
 * 方法名：replaceInfeasibleMission
 * 作用：在世界变化或身份变化导致未完成使命客观不可达时，将其替换为同类型使命并保留替换历史。
 * @param state 当前玩家私有使命状态。
 * @param catalog 静态使命定义注册表。
 * @param previousMissionId 已客观不可完成且尚未完成的使命资源标识。
 * @param replacementMissionId 已由生成系统筛选完成的同类型替代使命资源标识。
 * @param reason 本次自动替换的客观原因。
 * @param currentTurn 本次替换发生的当前回合编号。
 * @returns 替换完成且新使命从零进度开始的不可变使命状态。
 * @throws 旧使命已完成、类型或替换分组不匹配、使命重复或原因非法时抛出错误。
 */
export function replaceInfeasibleMission(
  state: PlayerMissionState,
  catalog: MissionDefinitionCatalog,
  previousMissionId: string,
  replacementMissionId: string,
  reason: MissionReplacementReason,
  currentTurn: number,
  replacementInitialProgress = 0,
): PlayerMissionState {
  validatePlayerMissionState(state, catalog);
  assertNonNegativeSafeInteger(currentTurn, "currentTurn");

  if (!MISSION_REPLACEMENT_REASONS.includes(reason)) {
    throw new RangeError(`Unsupported mission replacement reason: ${reason}`);
  }

  const previousIndex = state.missions.findIndex(
    (instance) => instance.missionId === previousMissionId,
  );

  if (previousIndex < 0) {
    throw new Error(`Player does not hold mission: ${previousMissionId}`);
  }

  const previousInstance = state.missions[previousIndex]!;
  const previousDefinition = getMissionDefinition(catalog, previousMissionId);
  const replacementDefinition = getMissionDefinition(catalog, replacementMissionId);

  if (previousInstance.completedAtTurn !== null) {
    throw new Error("Completed missions cannot be replaced");
  }

  if (previousDefinition.type !== replacementDefinition.type) {
    throw new Error("Automatic mission replacement must preserve mission type");
  }

  if (
    reason !== "PLAYER_REFORGE" &&
    previousDefinition.replacementGroupId !== replacementDefinition.replacementGroupId
  ) {
    throw new Error("Automatic mission replacement must preserve replacement group");
  }

  assertNonNegativeSafeInteger(replacementInitialProgress, "replacementInitialProgress");
  if (replacementInitialProgress >= replacementDefinition.requiredProgress) {
    throw new Error("Replacement mission cannot be completed when it is assigned");
  }

  if (state.missions.some((instance) => instance.missionId === replacementMissionId)) {
    throw new Error(`Player already holds replacement mission: ${replacementMissionId}`);
  }

  const missions = [...state.missions];
  missions[previousIndex] = {
    missionId: replacementMissionId,
    currentProgress: replacementInitialProgress,
    completedAtTurn: null,
    completedSourceId: null,
  };

  return freezeState({
    ...state,
    missions,
    replacementHistory: [
      ...state.replacementHistory,
      {
        previousMissionId,
        replacementMissionId,
        reason,
        replacedAtTurn: currentTurn,
      },
    ],
  });
}

/**
 * 方法名：getCompletedMissionCount
 * 作用：读取玩家当前已经永久完成并计入胜利条件的使命数量。
 * @param missions 当前玩家持有的使命实例集合。
 * @returns 已完成使命数量。
 */
export function getCompletedMissionCount(missions: readonly PlayerMissionInstance[]): number {
  return missions.filter((instance) => instance.completedAtTurn !== null).length;
}

/**
 * 方法名：validatePlayerMissionState
 * 作用：校验玩家使命集合的数量、类型覆盖、进度边界、完成记录和替换历史。
 * @param state 需要校验的玩家私有使命状态。
 * @param catalog 静态使命定义注册表。
 * @returns 无返回值。
 * @throws 使命状态与静态定义不一致或任意运行时字段非法时抛出错误。
 */
export function validatePlayerMissionState(
  state: PlayerMissionState,
  catalog: MissionDefinitionCatalog,
): void {
  assertNonEmptyString(state.ownerId, "ownerId");
  validateMissionDefinitionCatalog(catalog);
  validateMissionIds(
    state.missions.map((instance) => instance.missionId),
    catalog,
  );

  for (const instance of state.missions) {
    const definition = getMissionDefinition(catalog, instance.missionId);
    assertNonNegativeSafeInteger(instance.currentProgress, "mission.currentProgress");

    if (instance.currentProgress > definition.requiredProgress) {
      throw new RangeError(`Mission progress exceeds required progress: ${instance.missionId}`);
    }

    const isCompleted = instance.completedAtTurn !== null;

    if (isCompleted !== (instance.completedSourceId !== null)) {
      throw new Error(
        `Mission completion fields must both be present or absent: ${instance.missionId}`,
      );
    }

    if (isCompleted) {
      assertNonNegativeSafeInteger(instance.completedAtTurn, "mission.completedAtTurn");
      assertNonEmptyString(instance.completedSourceId!, "mission.completedSourceId");

      if (instance.currentProgress !== definition.requiredProgress) {
        throw new Error(`Completed mission must have full progress: ${instance.missionId}`);
      }
    }
  }

  if (!MISSION_VICTORY_STATUSES.includes(state.victoryStatus)) {
    throw new RangeError(`Unsupported mission victory status: ${state.victoryStatus}`);
  }

  if (
    state.victoryStatus !== "NONE" &&
    getCompletedMissionCount(state.missions) < MISSION_COMPLETION_COUNT_FOR_VICTORY
  ) {
    throw new Error("Mission victory status requires enough completed missions");
  }

  for (const entry of state.replacementHistory) {
    getMissionDefinition(catalog, entry.previousMissionId);
    getMissionDefinition(catalog, entry.replacementMissionId);

    if (!MISSION_REPLACEMENT_REASONS.includes(entry.reason)) {
      throw new RangeError(`Unsupported mission replacement reason: ${entry.reason}`);
    }

    assertNonNegativeSafeInteger(entry.replacedAtTurn, "mission.replacedAtTurn");
  }
}

/** 校验创建使命状态时恰好包含五类各一个且不重复的合法使命。 */
function validateMissionIds(
  missionIds: readonly string[],
  catalog: MissionDefinitionCatalog,
): void {
  if (missionIds.length !== MISSION_COUNT_PER_PLAYER) {
    throw new RangeError(`A player must hold exactly ${MISSION_COUNT_PER_PLAYER} missions`);
  }

  const missionIdsSeen = new Set<string>();
  const missionTypesSeen = new Set<string>();

  for (const missionId of missionIds) {
    const definition = getMissionDefinition(catalog, missionId);

    if (missionIdsSeen.has(missionId)) {
      throw new Error(`Player missions cannot contain duplicates: ${missionId}`);
    }

    if (missionTypesSeen.has(definition.type)) {
      throw new Error(`Player missions cannot contain duplicate types: ${definition.type}`);
    }

    missionIdsSeen.add(missionId);
    missionTypesSeen.add(definition.type);
  }

  for (const missionType of MISSION_TYPES) {
    if (!missionTypesSeen.has(missionType)) {
      throw new Error(`Player missions must contain type: ${missionType}`);
    }
  }
}

/** 校验外部进度事件的进度口径、数量和来源标识。 */
function validateMissionProgressEvent(event: MissionProgressEvent): void {
  assertNonEmptyString(event.progressKey, "progressKey");
  assertPositiveSafeInteger(event.count, "count");
  assertNonEmptyString(event.sourceId, "sourceId");
}

/** 冻结玩家使命状态中的所有可变数组与记录。 */
function freezeState(state: PlayerMissionState): PlayerMissionState {
  return Object.freeze({
    ownerId: state.ownerId,
    missions: Object.freeze(state.missions.map((instance) => Object.freeze({ ...instance }))),
    replacementHistory: Object.freeze(
      state.replacementHistory.map((entry) => Object.freeze({ ...entry })),
    ),
    victoryStatus: state.victoryStatus,
  });
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
