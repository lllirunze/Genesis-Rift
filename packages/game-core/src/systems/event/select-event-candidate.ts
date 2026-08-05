import type { RandomStream } from "../random/core/random-stream.ts";
import { pickWeightedItem } from "../random/policy/weighted-random-policy.ts";
import {
  collectEventPoolCandidates,
  type EventPoolCandidate,
} from "./collect-event-pool-candidates.ts";
import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import {
  evaluateEventConditionExpression,
  type EventConditionEvaluationContext,
} from "./evaluate-event-condition.ts";
import type { EventPoolDefinition } from "./event-pool-definition.ts";

/** 描述一次已经完成揭露并正式开始的历史事件。 */
export interface RevealedEventOccurrence {
  readonly eventId: string;
  readonly triggeringPlayerId: string | null;
  readonly revealedAtTurn: number;
}

/** 描述本次候选筛选需要的触发者、当前时间与历史记录。 */
export interface EventCandidateSelectionContext {
  readonly triggeringPlayerId: string | null;
  readonly currentTurn: number;
  readonly conditionContext: EventConditionEvaluationContext;
  readonly revealedOccurrences: readonly RevealedEventOccurrence[];
}

/**
 * 方法名：filterEligibleEventCandidates
 * 作用：根据条件、重复规则、冷却与当前权重筛选可参与抽取的事件候选。
 * @param candidates 合并事件池后得到的候选事件集合。
 * @param context 本次触发的条件事实、玩家、时间与揭露历史。
 * @returns 保持原有顺序的合法正权重候选集合。
 * @throws 当前回合或历史记录字段非法时抛出错误。
 */
export function filterEligibleEventCandidates(
  candidates: readonly EventPoolCandidate[],
  context: EventCandidateSelectionContext,
): readonly EventPoolCandidate[] {
  validateSelectionContext(context);

  return candidates.filter(
    (candidate) =>
      candidate.currentWeight > 0 &&
      satisfiesTriggerCondition(candidate.event, context.conditionContext) &&
      satisfiesOccurrenceRules(candidate.event, context),
  );
}

/**
 * 方法名：selectEventCandidate
 * 作用：从已经合并的事件候选中筛选并按整数权重抽取一项事件。
 * @param randomStream 本次抽取使用的独立事件随机流。
 * @param candidates 合并事件池后得到的候选事件集合。
 * @param context 本次触发的条件事实、玩家、时间与揭露历史。
 * @returns 抽中的事件候选；没有合法候选时返回 null。
 */
export function selectEventCandidate(
  randomStream: RandomStream,
  candidates: readonly EventPoolCandidate[],
  context: EventCandidateSelectionContext,
): EventPoolCandidate | null {
  if (randomStream.streamType !== "event") {
    throw new Error(`Event selection requires an event random stream: ${randomStream.streamType}`);
  }

  const eligibleCandidates = filterEligibleEventCandidates(candidates, context);

  if (eligibleCandidates.length === 0) {
    return null;
  }

  return pickWeightedItem(
    randomStream,
    eligibleCandidates.map((candidate) => ({
      item: candidate,
      weight: candidate.currentWeight,
    })),
  );
}

/**
 * 方法名：selectEventFromPools
 * 作用：完成事件池合并、去重、条件筛选与整数权重抽取的完整流程。
 * @param randomStream 本次抽取使用的独立事件随机流。
 * @param pools 本次触发共同参与的事件池。
 * @param eventCatalog 事件池引用的事件定义注册表。
 * @param context 本次触发的条件事实、玩家、时间与揭露历史。
 * @returns 抽中的事件候选；没有合法候选时返回 null。
 */
export function selectEventFromPools(
  randomStream: RandomStream,
  pools: readonly EventPoolDefinition[],
  eventCatalog: EventDefinitionCatalog,
  context: EventCandidateSelectionContext,
): EventPoolCandidate | null {
  return selectEventCandidate(
    randomStream,
    collectEventPoolCandidates(pools, eventCatalog),
    context,
  );
}

/**
 * 方法名：satisfiesTriggerCondition
 * 作用：判断事件是否不存在额外条件或其触发条件已经成立。
 * @param event 需要判断的事件定义。
 * @param context 条件求值使用的标准化只读事实。
 * @returns 事件触发条件成立时返回 true，否则返回 false。
 */
function satisfiesTriggerCondition(
  event: EventDefinition,
  context: EventConditionEvaluationContext,
): boolean {
  return (
    event.triggerCondition === null ||
    evaluateEventConditionExpression(event.triggerCondition, context)
  );
}

/**
 * 方法名：satisfiesOccurrenceRules
 * 作用：根据已经揭露的历史判断事件是否满足唯一性与冷却规则。
 * @param event 需要判断的事件定义。
 * @param context 本次触发的玩家、时间与揭露历史。
 * @returns 事件允许再次进入候选集合时返回 true，否则返回 false。
 */
function satisfiesOccurrenceRules(
  event: EventDefinition,
  context: EventCandidateSelectionContext,
): boolean {
  const eventOccurrences = context.revealedOccurrences.filter(
    (occurrence) => occurrence.eventId === event.eventId,
  );

  if (event.repeatRule === "oncePerGame") {
    return eventOccurrences.length === 0;
  }

  if (event.repeatRule === "oncePerPlayer") {
    return (
      context.triggeringPlayerId !== null &&
      !eventOccurrences.some(
        (occurrence) => occurrence.triggeringPlayerId === context.triggeringPlayerId,
      )
    );
  }

  if (event.cooldownTurns === 0) {
    return true;
  }

  const scopedOccurrences = eventOccurrences.filter(
    (occurrence) => occurrence.triggeringPlayerId === context.triggeringPlayerId,
  );
  const latestOccurrence = scopedOccurrences.reduce<RevealedEventOccurrence | null>(
    (latest, occurrence) =>
      latest === null || occurrence.revealedAtTurn > latest.revealedAtTurn ? occurrence : latest,
    null,
  );

  return (
    latestOccurrence === null ||
    context.currentTurn - latestOccurrence.revealedAtTurn > event.cooldownTurns
  );
}

/**
 * 方法名：validateSelectionContext
 * 作用：校验当前回合及已经揭露事件历史的基础时间字段。
 * @param context 需要校验的候选筛选上下文。
 * @returns 无返回值。
 * @throws 当前回合、玩家标识或历史时间非法时抛出错误。
 */
function validateSelectionContext(context: EventCandidateSelectionContext): void {
  assertPositiveSafeInteger(context.currentTurn, "currentTurn");

  if (context.triggeringPlayerId !== null && context.triggeringPlayerId.trim().length === 0) {
    throw new TypeError("triggeringPlayerId must not be empty");
  }

  for (const occurrence of context.revealedOccurrences) {
    if (occurrence.eventId.trim().length === 0) {
      throw new TypeError("revealedOccurrences.eventId must not be empty");
    }

    if (
      occurrence.triggeringPlayerId !== null &&
      occurrence.triggeringPlayerId.trim().length === 0
    ) {
      throw new TypeError("revealedOccurrences.triggeringPlayerId must not be empty");
    }

    assertPositiveSafeInteger(occurrence.revealedAtTurn, "revealedOccurrences.revealedAtTurn");

    if (occurrence.revealedAtTurn > context.currentTurn) {
      throw new RangeError("revealed event occurrences cannot be in the future");
    }
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验数值为正安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值不是正安全整数时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
