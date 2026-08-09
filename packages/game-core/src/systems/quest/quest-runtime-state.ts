import {
  MAX_ACTIVE_QUEST_COUNT,
  QUEST_OBJECTIVE_TYPES,
  QUEST_REWARD_STATES,
  QUEST_STATUSES,
  type QuestObjectiveType,
  type QuestRewardState,
  type QuestStatus,
} from "./quest-config.ts";
import {
  getQuestDefinition,
  validateQuestDefinitionCatalog,
  type QuestDefinitionCatalog,
} from "./quest-definition.ts";
import type { RandomStream } from "../random/core/random-stream.ts";
import {
  ALWAYS_SATISFIED_QUEST_CONDITION_EVALUATOR,
  areQuestConditionsSatisfied,
  type QuestConditionContext,
  type QuestConditionEvaluator,
} from "./quest-condition.ts";
import {
  generateQuestRewards,
  getQuestRewardPool,
  validateQuestRewardDefinition,
  validateQuestRewardPoolCatalog,
  type QuestRewardDefinition,
  type QuestRewardPoolCatalog,
} from "./quest-reward-pool.ts";

/** 描述某个任务目标在单个任务实例中的当前完成数量。 */
export interface QuestObjectiveProgress {
  readonly objectiveId: string;
  readonly currentCount: number;
}

/** 描述某位玩家当前持有的动态任务实例。 */
export interface QuestInstance {
  readonly questInstanceId: string;
  readonly ownerId: string;
  readonly questId: string;
  readonly status: QuestStatus;
  readonly objectiveProgresses: readonly QuestObjectiveProgress[];
  readonly remainingTurns: number;
  readonly acceptedAtTurn: number | null;
  readonly completedAtTurn: number | null;
  readonly endedAtTurn: number | null;
  readonly rewardState: QuestRewardState;
  readonly generatedRewards: readonly QuestRewardDefinition[] | null;
}

/** 描述已经结束且不再显示于任务栏中的任务生命周期记录。 */
export interface QuestHistoryEntry {
  readonly questInstanceId: string;
  readonly questId: string;
  readonly ownerId: string;
  readonly status: "CLAIMED" | "ABANDONED" | "EXPIRED";
  readonly acceptedAtTurn: number | null;
  readonly completedAtTurn: number | null;
  readonly endedAtTurn: number;
}

/** 描述单名玩家可查看和管理的任务栏状态。 */
export interface PlayerQuestState {
  readonly ownerId: string;
  readonly quests: readonly QuestInstance[];
  readonly history: readonly QuestHistoryEntry[];
}

/** 描述本局已经领取过的唯一任务奖励，用于限制其再次出现。 */
export interface UniqueQuestRegistryState {
  readonly claimedQuestIds: readonly string[];
}

/** 描述外部系统提交给任务系统的统一进度事件。 */
export interface QuestProgressEvent {
  readonly type: QuestObjectiveType;
  readonly targetId: string | null;
  readonly count: number;
}

/** 描述任务奖励需要由其他业务模块执行的中立指令。 */
export interface QuestRewardInstruction {
  readonly questInstanceId: string;
  readonly questId: string;
  readonly ownerId: string;
  readonly rewardId: string;
  readonly type: QuestRewardDefinition["type"];
  readonly targetId: string | null;
  readonly amount: number;
}

/**
 * 方法名：createPlayerQuestState
 * 作用：创建不包含任何已领取或可领取任务的玩家任务栏。
 * @param ownerId 任务栏所属玩家的运行时标识。
 * @returns 不可变的空任务栏状态。
 * @throws 玩家标识为空时抛出错误。
 */
export function createPlayerQuestState(ownerId: string): PlayerQuestState {
  assertNonEmptyString(ownerId, "ownerId");
  return Object.freeze({ ownerId, quests: Object.freeze([]), history: Object.freeze([]) });
}

/**
 * 方法名：createUniqueQuestRegistryState
 * 作用：创建不包含已领取唯一任务奖励的本局任务注册表。
 * @returns 不可变的空唯一任务注册表。
 */
export function createUniqueQuestRegistryState(): UniqueQuestRegistryState {
  return Object.freeze({ claimedQuestIds: Object.freeze([]) });
}

/**
 * 方法名：offerQuest
 * 作用：为玩家创建一条尚未领取的可领取任务实例。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param questInstanceId 本次任务实例的唯一运行时标识。
 * @param questId 需要提供给玩家的任务资源 ID。
 * @returns 包含新可领取任务的不可变任务栏。
 * @throws 任务不存在、实例标识重复或玩家已经持有同一任务资源时抛出错误。
 */
export function offerQuest(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  questInstanceId: string,
  questId: string,
): PlayerQuestState {
  validatePlayerQuestState(state, catalog);
  validateQuestDefinitionCatalog(catalog);
  assertNonEmptyString(questInstanceId, "questInstanceId");
  const definition = getQuestDefinition(catalog, questId);

  if (state.quests.some((quest) => quest.questInstanceId === questInstanceId)) {
    throw new Error(`Duplicate quest instance id: ${questInstanceId}`);
  }

  if (state.quests.some((quest) => quest.questId === questId)) {
    throw new Error(`Player already holds quest: ${questId}`);
  }

  const instance: QuestInstance = Object.freeze({
    questInstanceId,
    ownerId: state.ownerId,
    questId,
    status: "AVAILABLE",
    objectiveProgresses: Object.freeze(
      definition.objectives.map((objective) =>
        Object.freeze({ objectiveId: objective.objectiveId, currentCount: 0 }),
      ),
    ),
    remainingTurns: definition.durationTurns,
    acceptedAtTurn: null,
    completedAtTurn: null,
    endedAtTurn: null,
    rewardState: "NOT_GENERATED",
    generatedRewards: null,
  });

  return Object.freeze({ ...state, quests: Object.freeze([...state.quests, instance]) });
}

/**
 * 方法名：acceptQuest
 * 作用：将可领取任务转换为进行中任务，并检查四格任务栏和唯一任务限制。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param uniqueRegistry 本局已经领取奖励的唯一任务注册表。
 * @param questInstanceId 需要领取的任务实例标识。
 * @param conditionContext 当前玩家与回合的任务条件上下文。
 * @param conditionEvaluator 负责读取外部条件状态的判断器。
 * @returns 领取后的不可变任务栏。
 * @throws 任务栏已满、任务不可领取或唯一任务已被领取时抛出错误。
 */
export function acceptQuest(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  uniqueRegistry: UniqueQuestRegistryState,
  questInstanceId: string,
  conditionContext: QuestConditionContext = { ownerId: state.ownerId, currentTurn: 0 },
  conditionEvaluator: QuestConditionEvaluator = ALWAYS_SATISFIED_QUEST_CONDITION_EVALUATOR,
): PlayerQuestState {
  validatePlayerQuestState(state, catalog);
  validateUniqueQuestRegistryState(uniqueRegistry);
  const instance = getQuestInstance(state, questInstanceId);
  const definition = getQuestDefinition(catalog, instance.questId);

  if (instance.status !== "AVAILABLE") {
    throw new Error("Only available quests can be accepted");
  }

  if (conditionContext.ownerId !== state.ownerId) {
    throw new Error("Quest condition owner must match the quest state owner");
  }

  if (
    !areQuestConditionsSatisfied(
      definition.acceptConditionIds,
      conditionEvaluator,
      conditionContext,
    )
  ) {
    throw new Error(`Quest accept conditions are not satisfied: ${definition.questId}`);
  }

  if (getActiveQuestCount(state) >= MAX_ACTIVE_QUEST_COUNT) {
    throw new Error(`A player can hold at most ${MAX_ACTIVE_QUEST_COUNT} active quests`);
  }

  if (definition.unique && uniqueRegistry.claimedQuestIds.includes(definition.questId)) {
    throw new Error(`Unique quest has already been completed: ${definition.questId}`);
  }

  return replaceQuest(
    state,
    Object.freeze({
      ...instance,
      status: "IN_PROGRESS",
      acceptedAtTurn: conditionContext.currentTurn,
    }),
  );
}

/**
 * 方法名：abandonQuest
 * 作用：在所属玩家自身回合内放弃未完成任务并从任务栏移除。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param questInstanceId 需要放弃的任务实例标识。
 * @param isOwnerTurn 是否正处于该任务所属玩家的回合。
 * @returns 移除任务后的不可变任务栏。
 * @throws 不是所属玩家回合，或任务已经完成时抛出错误。
 */
export function abandonQuest(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  questInstanceId: string,
  isOwnerTurn: boolean,
  currentTurn = 0,
): PlayerQuestState {
  validatePlayerQuestState(state, catalog);

  if (!isOwnerTurn) {
    throw new Error("Quests can only be abandoned during the owner's turn");
  }

  const instance = getQuestInstance(state, questInstanceId);

  if (instance.status === "COMPLETED") {
    throw new Error("Completed quests must be claimed instead of abandoned");
  }

  return endQuest(state, instance, "ABANDONED", currentTurn);
}

/**
 * 方法名：applyQuestProgressEvent
 * 作用：将战斗、探索、交付等业务事件推进当前玩家所有匹配的进行中任务。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param event 由其他业务模块提交的统一任务进度事件。
 * @returns 进度更新后且可能转换为完成状态的不可变任务栏。
 * @throws 事件数量非法或任务状态与定义不一致时抛出错误。
 */
export function applyQuestProgressEvent(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  event: QuestProgressEvent,
  currentTurn = 0,
): PlayerQuestState {
  validatePlayerQuestState(state, catalog);
  validateQuestProgressEvent(event);

  return Object.freeze({
    ...state,
    quests: Object.freeze(
      state.quests.map((instance) => advanceQuestInstance(instance, catalog, event, currentTurn)),
    ),
  });
}

/**
 * 方法名：advanceQuestDurations
 * 作用：在所属玩家回合结束时减少进行中任务的剩余有效回合，并移除已失效任务。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @returns 已减少有效回合且移除过期任务的不可变任务栏。
 */
export function advanceQuestDurations(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  currentTurn = 0,
): PlayerQuestState {
  validatePlayerQuestState(state, catalog);

  const expiredInstances: QuestInstance[] = [];
  const quests = state.quests.flatMap((instance) => {
    if (instance.status !== "IN_PROGRESS") {
      return [instance];
    }

    const remainingTurns = instance.remainingTurns - 1;
    if (remainingTurns === 0) {
      expiredInstances.push(instance);
      return [];
    }

    return [Object.freeze({ ...instance, remainingTurns })];
  });

  return Object.freeze({
    ...state,
    quests: Object.freeze(quests),
    history: Object.freeze([
      ...state.history,
      ...expiredInstances.map((instance) =>
        createQuestHistoryEntry(instance, "EXPIRED", currentTurn),
      ),
    ]),
  });
}

/**
 * 方法名：claimQuestRewards
 * 作用：领取已完成任务的奖励指令并从任务栏移除，唯一任务同时写入本局注册表。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param uniqueRegistry 本局已经领取奖励的唯一任务注册表。
 * @param questInstanceId 需要领取奖励的任务实例标识。
 * @returns 更新后的任务栏、唯一任务注册表和交给下游系统执行的奖励指令。
 * @throws 任务未完成或唯一任务奖励已被领取时抛出错误。
 */
export function claimQuestRewards(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  uniqueRegistry: UniqueQuestRegistryState,
  questInstanceId: string,
  currentTurn = 0,
): {
  readonly state: PlayerQuestState;
  readonly uniqueRegistry: UniqueQuestRegistryState;
  readonly rewardInstructions: readonly QuestRewardInstruction[];
} {
  validatePlayerQuestState(state, catalog);
  validateUniqueQuestRegistryState(uniqueRegistry);
  const instance = getQuestInstance(state, questInstanceId);
  const definition = getQuestDefinition(catalog, instance.questId);

  if (instance.status !== "COMPLETED" || instance.generatedRewards === null) {
    throw new Error("Completed quests must generate rewards before they can be claimed");
  }

  if (definition.unique && uniqueRegistry.claimedQuestIds.includes(definition.questId)) {
    throw new Error(`Unique quest reward already claimed: ${definition.questId}`);
  }

  return Object.freeze({
    state: endQuest(state, instance, "CLAIMED", currentTurn),
    uniqueRegistry: definition.unique
      ? Object.freeze({
          claimedQuestIds: Object.freeze([...uniqueRegistry.claimedQuestIds, definition.questId]),
        })
      : uniqueRegistry,
    rewardInstructions: Object.freeze(
      instance.generatedRewards.map((reward) => createRewardInstruction(instance, reward)),
    ),
  });
}

/**
 * 方法名：generateQuestRewardResults
 * 作用：为已完成任务生成并固化一次奖励结果，避免领取重试改变随机结果。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param rewardPoolCatalog 已校验的任务奖励池注册表。
 * @param randomStream 当前对局中专用于任务奖励的随机流。
 * @param questInstanceId 需要生成奖励的任务实例标识。
 * @returns 写入已生成奖励结果后的不可变任务栏。
 * @throws 任务未完成、奖励池不存在或任务实例非法时抛出错误。
 */
export function generateQuestRewardResults(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  rewardPoolCatalog: QuestRewardPoolCatalog,
  randomStream: RandomStream,
  questInstanceId: string,
): PlayerQuestState {
  validatePlayerQuestState(state, catalog);
  validateQuestDefinitionCatalog(catalog);
  validateQuestRewardPoolCatalog(rewardPoolCatalog);
  const instance = getQuestInstance(state, questInstanceId);

  if (instance.status !== "COMPLETED") {
    throw new Error("Only completed quests can generate rewards");
  }

  if (instance.generatedRewards !== null) {
    return state;
  }

  const definition = getQuestDefinition(catalog, instance.questId);
  const pool = getQuestRewardPool(rewardPoolCatalog, definition.rewardPoolId);
  const generatedRewards = generateQuestRewards(pool, randomStream);

  return replaceQuest(
    state,
    Object.freeze({ ...instance, generatedRewards, rewardState: "GENERATED" }),
  );
}

/**
 * 方法名：validatePlayerQuestState
 * 作用：校验玩家任务栏的归属、实例唯一性、状态和目标进度是否与静态定义一致。
 * @param state 需要校验的玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @returns 无返回值。
 * @throws 玩家标识、任务实例、任务状态或目标进度不符合规则时抛出错误。
 */
export function validatePlayerQuestState(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
): void {
  assertNonEmptyString(state.ownerId, "ownerId");
  const instanceIds = new Set<string>();
  const questIds = new Set<string>();
  const historyInstanceIds = new Set<string>();

  for (const instance of state.quests) {
    assertNonEmptyString(instance.questInstanceId, "questInstanceId");

    if (instance.ownerId !== state.ownerId) {
      throw new Error("Quest instance owner must match the quest state owner");
    }

    if (instanceIds.has(instance.questInstanceId) || questIds.has(instance.questId)) {
      throw new Error("Player quest state cannot contain duplicate quest instances or quest ids");
    }

    if (!QUEST_STATUSES.includes(instance.status)) {
      throw new RangeError(`Unsupported quest status: ${instance.status}`);
    }

    const definition = getQuestDefinition(catalog, instance.questId);
    validateQuestInstanceProgress(
      instance,
      definition.objectives.map((objective) => objective.objectiveId),
    );
    validateQuestLifecycleFields(instance);
    validateGeneratedRewards(instance);
    instanceIds.add(instance.questInstanceId);
    questIds.add(instance.questId);
  }

  for (const entry of state.history) {
    validateQuestHistoryEntry(entry, state.ownerId);

    if (historyInstanceIds.has(entry.questInstanceId) || instanceIds.has(entry.questInstanceId)) {
      throw new Error("Quest history cannot contain duplicate or active quest instances");
    }

    historyInstanceIds.add(entry.questInstanceId);
  }
}

/** 校验任务实例的生命周期时间戳与当前状态保持一致。 */
function validateQuestLifecycleFields(instance: QuestInstance): void {
  assertNullableNonNegativeSafeInteger(instance.acceptedAtTurn, "acceptedAtTurn");
  assertNullableNonNegativeSafeInteger(instance.completedAtTurn, "completedAtTurn");

  if (instance.endedAtTurn !== null) {
    throw new Error("Active quest instances cannot define endedAtTurn");
  }

  if (instance.status === "AVAILABLE") {
    if (instance.acceptedAtTurn !== null || instance.completedAtTurn !== null) {
      throw new Error("Available quests cannot define lifecycle completion timestamps");
    }

    return;
  }

  if (instance.status === "IN_PROGRESS") {
    if (instance.acceptedAtTurn === null || instance.completedAtTurn !== null) {
      throw new Error("In-progress quests must define only their accepted turn");
    }

    return;
  }

  if (instance.status === "COMPLETED") {
    if (instance.acceptedAtTurn === null || instance.completedAtTurn === null) {
      throw new Error("Completed quests must define accepted and completed turns");
    }

    if (instance.completedAtTurn < instance.acceptedAtTurn) {
      throw new Error("Quest completed turn cannot precede its accepted turn");
    }

    return;
  }

  throw new Error("Ended quest statuses must be stored in quest history instead of active state");
}

/** 校验任务实例中已固化奖励的状态与内容。 */
function validateGeneratedRewards(instance: QuestInstance): void {
  if (!QUEST_REWARD_STATES.includes(instance.rewardState)) {
    throw new RangeError(`Unsupported quest reward state: ${instance.rewardState}`);
  }

  if (instance.status !== "COMPLETED" && instance.generatedRewards !== null) {
    throw new Error("Only completed quests can contain generated rewards");
  }

  if (instance.generatedRewards !== null) {
    for (const reward of instance.generatedRewards) {
      validateQuestRewardDefinition(reward);
    }
  }

  if (
    (instance.rewardState === "NOT_GENERATED" && instance.generatedRewards !== null) ||
    (instance.rewardState === "GENERATED" && instance.generatedRewards === null)
  ) {
    throw new Error("Quest reward state must match whether generated rewards are present");
  }
}

/** 校验本局唯一任务奖励注册表。 */
export function validateUniqueQuestRegistryState(registry: UniqueQuestRegistryState): void {
  const questIds = new Set<string>();

  for (const questId of registry.claimedQuestIds) {
    assertNonEmptyString(questId, "claimedQuestIds");

    if (questIds.has(questId)) {
      throw new Error(`Duplicate claimed unique quest id: ${questId}`);
    }

    questIds.add(questId);
  }
}

/** 返回任务栏中已经占用任务栏位的任务数量。 */
function getActiveQuestCount(state: PlayerQuestState): number {
  return state.quests.filter(
    (quest) => quest.status === "IN_PROGRESS" || quest.status === "COMPLETED",
  ).length;
}

/** 根据任务实例标识读取玩家当前持有的任务。 */
function getQuestInstance(state: PlayerQuestState, questInstanceId: string): QuestInstance {
  assertNonEmptyString(questInstanceId, "questInstanceId");
  const instance = state.quests.find((quest) => quest.questInstanceId === questInstanceId);

  if (instance === undefined) {
    throw new Error(`Unknown player quest instance: ${questInstanceId}`);
  }

  return instance;
}

/** 将单个任务实例替换为新的不可变实例。 */
function replaceQuest(state: PlayerQuestState, replacement: QuestInstance): PlayerQuestState {
  return Object.freeze({
    ...state,
    quests: Object.freeze(
      state.quests.map((quest) =>
        quest.questInstanceId === replacement.questInstanceId ? replacement : quest,
      ),
    ),
  });
}

/** 依据一个业务事件推进单个进行中任务。 */
function advanceQuestInstance(
  instance: QuestInstance,
  catalog: QuestDefinitionCatalog,
  event: QuestProgressEvent,
  currentTurn: number,
): QuestInstance {
  if (instance.status !== "IN_PROGRESS") {
    return instance;
  }

  const definition = getQuestDefinition(catalog, instance.questId);
  const objectiveProgresses = instance.objectiveProgresses.map((progress) => {
    const objective = definition.objectives.find(
      (item) => item.objectiveId === progress.objectiveId,
    );

    if (objective === undefined || !isMatchingObjective(objective, event)) {
      return progress;
    }

    return Object.freeze({
      ...progress,
      currentCount: Math.min(objective.requiredCount, progress.currentCount + event.count),
    });
  });
  const completed = definition.objectives[definition.completionRule === "ALL" ? "every" : "some"](
    (objective) => {
      const progress = objectiveProgresses.find(
        (item) => item.objectiveId === objective.objectiveId,
      );
      return progress !== undefined && progress.currentCount >= objective.requiredCount;
    },
  );

  return Object.freeze({
    ...instance,
    status: completed ? "COMPLETED" : "IN_PROGRESS",
    completedAtTurn: completed ? currentTurn : null,
    objectiveProgresses: Object.freeze(objectiveProgresses),
  });
}

/** 将已结束任务写入历史记录并从当前任务栏移除。 */
function endQuest(
  state: PlayerQuestState,
  instance: QuestInstance,
  status: QuestHistoryEntry["status"],
  currentTurn: number,
): PlayerQuestState {
  assertNonNegativeSafeInteger(currentTurn, "currentTurn");

  return Object.freeze({
    ...state,
    quests: Object.freeze(
      state.quests.filter((quest) => quest.questInstanceId !== instance.questInstanceId),
    ),
    history: Object.freeze([
      ...state.history,
      createQuestHistoryEntry(instance, status, currentTurn),
    ]),
  });
}

/** 根据运行时任务实例创建可用于日志、存档与复盘的结束记录。 */
function createQuestHistoryEntry(
  instance: QuestInstance,
  status: QuestHistoryEntry["status"],
  endedAtTurn: number,
): QuestHistoryEntry {
  assertNonNegativeSafeInteger(endedAtTurn, "endedAtTurn");

  return Object.freeze({
    questInstanceId: instance.questInstanceId,
    questId: instance.questId,
    ownerId: instance.ownerId,
    status,
    acceptedAtTurn: instance.acceptedAtTurn,
    completedAtTurn: instance.completedAtTurn,
    endedAtTurn,
  });
}

/** 校验已经结束的任务历史记录。 */
function validateQuestHistoryEntry(entry: QuestHistoryEntry, ownerId: string): void {
  assertNonEmptyString(entry.questInstanceId, "history.questInstanceId");
  assertNonEmptyString(entry.questId, "history.questId");

  if (entry.ownerId !== ownerId) {
    throw new Error("Quest history owner must match the quest state owner");
  }

  if (!["CLAIMED", "ABANDONED", "EXPIRED"].includes(entry.status)) {
    throw new RangeError(`Unsupported ended quest status: ${entry.status}`);
  }

  assertNullableNonNegativeSafeInteger(entry.acceptedAtTurn, "history.acceptedAtTurn");
  assertNullableNonNegativeSafeInteger(entry.completedAtTurn, "history.completedAtTurn");
  assertNonNegativeSafeInteger(entry.endedAtTurn, "history.endedAtTurn");
}

/** 判断任务目标是否应消费当前业务进度事件。 */
function isMatchingObjective(
  objective: { readonly type: QuestObjectiveType; readonly targetId: string | null },
  event: QuestProgressEvent,
): boolean {
  return (
    objective.type === event.type &&
    (objective.targetId === null || objective.targetId === event.targetId)
  );
}

/** 将静态奖励转换为不直接耦合任何其他系统的奖励指令。 */
function createRewardInstruction(
  instance: QuestInstance,
  reward: QuestRewardDefinition,
): QuestRewardInstruction {
  return Object.freeze({
    questInstanceId: instance.questInstanceId,
    questId: instance.questId,
    ownerId: instance.ownerId,
    rewardId: reward.rewardId,
    type: reward.type,
    targetId: reward.targetId,
    amount: reward.amount,
  });
}

/** 校验任务进度事件的目标与数量。 */
function validateQuestProgressEvent(event: QuestProgressEvent): void {
  if (!QUEST_OBJECTIVE_TYPES.includes(event.type)) {
    throw new RangeError(`Unsupported quest progress event type: ${event.type}`);
  }

  assertNullableNonEmptyString(event.targetId, "event.targetId");
  assertPositiveSafeInteger(event.count, "event.count");
}

/** 校验实例目标进度完整覆盖静态定义且不会出现负数或重复。 */
function validateQuestInstanceProgress(
  instance: QuestInstance,
  objectiveIds: readonly string[],
): void {
  assertPositiveSafeInteger(instance.remainingTurns, "remainingTurns");
  const progressIds = new Set<string>();

  for (const progress of instance.objectiveProgresses) {
    assertNonEmptyString(progress.objectiveId, "objectiveProgresses.objectiveId");

    if (!objectiveIds.includes(progress.objectiveId) || progressIds.has(progress.objectiveId)) {
      throw new Error("Quest instance objective progresses must match the quest definition");
    }

    assertNonNegativeSafeInteger(progress.currentCount, "objectiveProgresses.currentCount");
    progressIds.add(progress.objectiveId);
  }

  if (progressIds.size !== objectiveIds.length) {
    throw new Error("Quest instance must track every objective in the quest definition");
  }
}

/** 校验可空数值在有值时为非负安全整数。 */
function assertNullableNonNegativeSafeInteger(value: number | null, field: string): void {
  if (value !== null) {
    assertNonNegativeSafeInteger(value, field);
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验可空字符串在有值时不为空。 */
function assertNullableNonEmptyString(value: string | null, field: string): void {
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

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
