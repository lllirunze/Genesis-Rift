import {
  getContractDefinition,
  validateContractDefinitionCatalog,
  type ContractDefinitionCatalog,
  type ContractEffectDefinition,
} from "./contract-definition.ts";

/** 描述一条已展示、签署或拒绝的私有契约机会记录。 */
export interface ContractOfferHistoryEntry {
  readonly opportunityId: string;
  readonly contractId: string;
  readonly outcome: "PENDING" | "SIGNED" | "REJECTED";
}

/** 描述玩家当前等待选择的私有契约机会。 */
export interface PendingContractOffer {
  readonly opportunityId: string;
  readonly contractId: string;
}

/** 描述神鬼契约效果向外部系统发出的永久效果注入指令。 */
export interface ContractEffectInstruction {
  readonly contractId: string;
  readonly ownerId: string;
  readonly phase: "BUFF" | "DEBUFF";
  readonly effect: ContractEffectDefinition;
}

/** 描述单名玩家在本局中的私有神鬼契约运行时状态。 */
export interface DivineContractState {
  readonly ownerId: string;
  readonly signedContractId: string | null;
  readonly hasSigned: boolean;
  readonly signedAtWorldRound: number | null;
  readonly signedAtPersonalTurn: number | null;
  readonly personalTurnsElapsed: number;
  readonly buffActive: boolean;
  readonly debuffActive: boolean;
  readonly pendingOffer: PendingContractOffer | null;
  readonly offerHistory: readonly ContractOfferHistoryEntry[];
  readonly stateVersion: number;
}

/** 描述签署或拒绝一次契约机会后的处理结果。 */
export interface ResolveContractOfferResult {
  readonly state: DivineContractState;
  readonly instructions: readonly ContractEffectInstruction[];
}

/** 描述玩家回合开始时推进契约计时后的处理结果。 */
export interface AdvanceContractAtTurnStartResult {
  readonly state: DivineContractState;
  readonly instructions: readonly ContractEffectInstruction[];
}

/**
 * 方法名：createDivineContractState
 * 作用：为玩家创建尚未获得任何契约机会的私有契约状态。
 * @param ownerId 契约状态所属玩家标识。
 * @returns 不可变的初始私有契约状态。
 * @throws 玩家标识为空时抛出错误。
 */
export function createDivineContractState(ownerId: string): DivineContractState {
  assertNonEmptyString(ownerId, "ownerId");

  return Object.freeze({
    ownerId,
    signedContractId: null,
    hasSigned: false,
    signedAtWorldRound: null,
    signedAtPersonalTurn: null,
    personalTurnsElapsed: 0,
    buffActive: false,
    debuffActive: false,
    pendingOffer: null,
    offerHistory: Object.freeze([]),
    stateVersion: 0,
  });
}

/**
 * 方法名：offerContract
 * 作用：向未签署契约的玩家私下提供一次不可重复查看的契约机会。
 * @param state 当前玩家私有契约状态。
 * @param catalog 已校验的契约资源注册表。
 * @param opportunityId 本次私有机会的运行时唯一标识。
 * @param contractId 本次提供的契约资源标识。
 * @returns 包含待选择机会的最新私有契约状态。
 * @throws 玩家已签署、已有待处理机会或机会标识重复时抛出错误。
 */
export function offerContract(
  state: DivineContractState,
  catalog: ContractDefinitionCatalog,
  opportunityId: string,
  contractId: string,
): DivineContractState {
  validateDivineContractState(state, catalog);
  validateContractDefinitionCatalog(catalog);
  assertNonEmptyString(opportunityId, "opportunityId");
  getContractDefinition(catalog, contractId);

  if (state.hasSigned) {
    throw new Error("A player can sign at most one divine contract per game");
  }

  if (state.pendingOffer !== null) {
    throw new Error("A player already has a pending divine contract offer");
  }

  if (state.offerHistory.some((entry) => entry.opportunityId === opportunityId)) {
    throw new Error(`Divine contract opportunity has already been used: ${opportunityId}`);
  }

  const entry = Object.freeze({ opportunityId, contractId, outcome: "PENDING" as const });
  return Object.freeze({
    ...state,
    pendingOffer: Object.freeze({ opportunityId, contractId }),
    offerHistory: Object.freeze([...state.offerHistory, entry]),
    stateVersion: state.stateVersion + 1,
  });
}

/**
 * 方法名：signPendingContract
 * 作用：确认签署待处理契约，并立即生成永久正面效果的注入指令。
 * @param state 当前玩家私有契约状态。
 * @param catalog 已校验的契约资源注册表。
 * @param worldRound 当前完整世界回合编号。
 * @param personalTurn 当前玩家个人回合编号。
 * @returns 签署后的状态及立即执行的正面效果指令。
 * @throws 不存在待处理机会、回合编号非法或已签署时抛出错误。
 */
export function signPendingContract(
  state: DivineContractState,
  catalog: ContractDefinitionCatalog,
  worldRound: number,
  personalTurn: number,
): ResolveContractOfferResult {
  validateDivineContractState(state, catalog);
  validateContractDefinitionCatalog(catalog);
  assertNonNegativeSafeInteger(worldRound, "worldRound");
  assertNonNegativeSafeInteger(personalTurn, "personalTurn");
  const pendingOffer = getPendingOffer(state);
  const definition = getContractDefinition(catalog, pendingOffer.contractId);
  const signedState = Object.freeze({
    ...state,
    signedContractId: definition.contractId,
    hasSigned: true,
    signedAtWorldRound: worldRound,
    signedAtPersonalTurn: personalTurn,
    buffActive: true,
    pendingOffer: null,
    offerHistory: replaceOfferOutcome(state.offerHistory, pendingOffer.opportunityId, "SIGNED"),
    stateVersion: state.stateVersion + 1,
  });

  return Object.freeze({
    state: signedState,
    instructions: Object.freeze([
      createEffectInstruction(signedState, definition.contractId, "BUFF", definition.buff),
    ]),
  });
}

/**
 * 方法名：rejectPendingContract
 * 作用：拒绝待处理契约机会，并永久关闭本次机会而不产生任何效果。
 * @param state 当前玩家私有契约状态。
 * @param catalog 已校验的契约资源注册表。
 * @returns 拒绝后的最新私有契约状态。
 * @throws 不存在待处理机会时抛出错误。
 */
export function rejectPendingContract(
  state: DivineContractState,
  catalog: ContractDefinitionCatalog,
): DivineContractState {
  validateDivineContractState(state, catalog);
  const pendingOffer = getPendingOffer(state);

  return Object.freeze({
    ...state,
    pendingOffer: null,
    offerHistory: replaceOfferOutcome(state.offerHistory, pendingOffer.opportunityId, "REJECTED"),
    stateVersion: state.stateVersion + 1,
  });
}

/**
 * 方法名：advanceContractAtPersonalTurnStart
 * 作用：在玩家自身回合开始时推进契约计时，并在满足条件时仅一次性激活永久负面效果。
 * @param state 当前玩家私有契约状态。
 * @param catalog 已校验的契约资源注册表。
 * @param worldStageId 当前世界阶段标识；无阶段时传入 null。
 * @returns 推进后的状态及本次需要执行的负面效果指令。
 * @throws 世界阶段标识为空字符串或状态非法时抛出错误。
 */
export function advanceContractAtPersonalTurnStart(
  state: DivineContractState,
  catalog: ContractDefinitionCatalog,
  worldStageId: string | null,
): AdvanceContractAtTurnStartResult {
  validateDivineContractState(state, catalog);
  validateNullableNonEmptyString(worldStageId, "worldStageId");

  if (!state.hasSigned || state.debuffActive) {
    return Object.freeze({ state, instructions: Object.freeze([]) });
  }

  const contractId = state.signedContractId!;
  const definition = getContractDefinition(catalog, contractId);
  const personalTurnsElapsed = state.personalTurnsElapsed + 1;
  const shouldActivateDebuff = shouldActivateContractDebuff(
    definition.debuffTrigger,
    personalTurnsElapsed,
    worldStageId,
  );
  const advancedState = Object.freeze({
    ...state,
    personalTurnsElapsed,
    debuffActive: shouldActivateDebuff,
    stateVersion: state.stateVersion + 1,
  });

  return Object.freeze({
    state: advancedState,
    instructions: shouldActivateDebuff
      ? Object.freeze([
          createEffectInstruction(advancedState, contractId, "DEBUFF", definition.debuff),
        ])
      : Object.freeze([]),
  });
}

/**
 * 方法名：validateDivineContractState
 * 作用：校验私有契约状态与契约资源之间的引用、阶段和历史记录一致性。
 * @param state 需要校验的玩家私有契约状态。
 * @param catalog 已校验的契约资源注册表。
 * @returns 无返回值。
 * @throws 状态字段冲突、资源不存在或机会记录非法时抛出错误。
 */
export function validateDivineContractState(
  state: DivineContractState,
  catalog: ContractDefinitionCatalog,
): void {
  validateContractDefinitionCatalog(catalog);
  assertNonEmptyString(state.ownerId, "ownerId");
  assertNonNegativeSafeInteger(state.personalTurnsElapsed, "personalTurnsElapsed");
  assertNonNegativeSafeInteger(state.stateVersion, "stateVersion");
  validateOfferHistory(state.offerHistory, catalog);

  if (state.hasSigned) {
    if (
      state.signedContractId === null ||
      state.signedAtWorldRound === null ||
      state.signedAtPersonalTurn === null
    ) {
      throw new Error("A signed divine contract requires contract and signing turn information");
    }
    getContractDefinition(catalog, state.signedContractId);
    assertNonNegativeSafeInteger(state.signedAtWorldRound, "signedAtWorldRound");
    assertNonNegativeSafeInteger(state.signedAtPersonalTurn, "signedAtPersonalTurn");

    if (!state.buffActive || state.pendingOffer !== null) {
      throw new Error("A signed divine contract must have its buff active and no pending offer");
    }
    return;
  }

  if (
    state.signedContractId !== null ||
    state.signedAtWorldRound !== null ||
    state.signedAtPersonalTurn !== null ||
    state.personalTurnsElapsed !== 0 ||
    state.buffActive ||
    state.debuffActive
  ) {
    throw new Error("An unsigned divine contract state cannot contain signed contract progress");
  }

  if (state.pendingOffer !== null) {
    assertNonEmptyString(state.pendingOffer.opportunityId, "pendingOffer.opportunityId");
    getContractDefinition(catalog, state.pendingOffer.contractId);
    const historyEntry = state.offerHistory.find(
      (entry) => entry.opportunityId === state.pendingOffer!.opportunityId,
    );

    if (
      historyEntry?.outcome !== "PENDING" ||
      historyEntry.contractId !== state.pendingOffer.contractId
    ) {
      throw new Error("Pending divine contract offers must have a matching pending history entry");
    }
  }
}

/** 判断当前个人回合是否应激活契约永久负面效果。 */
function shouldActivateContractDebuff(
  trigger: import("./contract-definition.ts").ContractDebuffTriggerDefinition,
  personalTurnsElapsed: number,
  worldStageId: string | null,
): boolean {
  if (trigger.type === "PERSONAL_TURN") {
    return personalTurnsElapsed >= trigger.personalTurnDelay;
  }

  return (
    (personalTurnsElapsed >= trigger.personalTurnDelay && worldStageId === trigger.worldStageId) ||
    personalTurnsElapsed >= trigger.latestPersonalTurn!
  );
}

/** 根据指定阶段创建需要交由外部系统执行的效果指令。 */
function createEffectInstruction(
  state: DivineContractState,
  contractId: string,
  phase: "BUFF" | "DEBUFF",
  effect: ContractEffectDefinition,
): ContractEffectInstruction {
  return Object.freeze({ contractId, ownerId: state.ownerId, phase, effect });
}

/** 读取待处理的契约机会，缺失时提供统一错误。 */
function getPendingOffer(state: DivineContractState): PendingContractOffer {
  if (state.pendingOffer === null) {
    throw new Error("No divine contract offer is pending");
  }

  return state.pendingOffer;
}

/** 将一条机会历史记录从待处理转换为最终结果。 */
function replaceOfferOutcome(
  entries: readonly ContractOfferHistoryEntry[],
  opportunityId: string,
  outcome: "SIGNED" | "REJECTED",
): readonly ContractOfferHistoryEntry[] {
  let replaced = false;
  const nextEntries = entries.map((entry) => {
    if (entry.opportunityId !== opportunityId) {
      return entry;
    }

    replaced = true;
    return Object.freeze({ ...entry, outcome });
  });

  if (!replaced) {
    throw new Error(`Unknown divine contract opportunity: ${opportunityId}`);
  }

  return Object.freeze(nextEntries);
}

/** 校验机会历史中不存在重复标识且引用的契约资源均存在。 */
function validateOfferHistory(
  entries: readonly ContractOfferHistoryEntry[],
  catalog: ContractDefinitionCatalog,
): void {
  const opportunityIds = new Set<string>();

  for (const entry of entries) {
    assertNonEmptyString(entry.opportunityId, "offerHistory.opportunityId");
    getContractDefinition(catalog, entry.contractId);

    if (entry.outcome !== "PENDING" && entry.outcome !== "SIGNED" && entry.outcome !== "REJECTED") {
      throw new RangeError(`Unsupported divine contract offer outcome: ${entry.outcome}`);
    }

    if (opportunityIds.has(entry.opportunityId)) {
      throw new Error(`Duplicate divine contract opportunity id: ${entry.opportunityId}`);
    }

    opportunityIds.add(entry.opportunityId);
  }
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验可空字符串不是空白内容。 */
function validateNullableNonEmptyString(value: string | null, field: string): void {
  if (value !== null) {
    assertNonEmptyString(value, field);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
