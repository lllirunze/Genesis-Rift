import type { EventPoolCandidate } from "./collect-event-pool-candidates.ts";
import { EVENT_INSTANCE_STATUSES } from "./event-runtime-config.ts";

/** 描述事件实例从抽取到终止所使用的运行时状态。 */
export type EventInstanceStatus = (typeof EVENT_INSTANCE_STATUSES)[number];

/** 描述所有事件运行时实例共同保存的内部信息。 */
interface EventInstanceBase {
  readonly instanceId: string;
  readonly eventId: string;
  readonly triggeringPlayerId: string | null;
  readonly sourcePoolIds: readonly string[];
  readonly triggeredAtTurn: number;
}

/** 描述已经抽取但尚未公开内容的事件实例。 */
export interface PendingRevealEventInstance extends EventInstanceBase {
  readonly status: "PENDING_REVEAL";
}

/** 描述已经公开并可以进入后续结算的事件实例。 */
export interface RevealedEventInstance extends EventInstanceBase {
  readonly status: "REVEALED";
  readonly revealedAtTurn: number;
}

/** 描述玩家放弃揭露且不会产生效果的事件实例。 */
export interface DeclinedEventInstance extends EventInstanceBase {
  readonly status: "DECLINED";
  readonly declinedAtTurn: number;
}

/** 描述事件抽取后可能处于的任意运行时状态。 */
export type EventInstance =
  PendingRevealEventInstance | RevealedEventInstance | DeclinedEventInstance;

/** 描述创建待揭露事件实例所需的输入。 */
export interface CreatePendingEventInstanceInput {
  readonly instanceId: string;
  readonly candidate: EventPoolCandidate;
  readonly triggeringPlayerId: string | null;
  readonly triggeredAtTurn: number;
}

/**
 * 方法名：createPendingEventInstance
 * 作用：将抽中的事件候选转换为不复制完整静态定义的待揭露实例。
 * @param input 事件实例标识、候选事件、触发玩家与触发回合。
 * @returns 新创建的待揭露事件实例。
 * @throws 输入字段非法或可选择揭露事件缺少触发玩家时抛出错误。
 */
export function createPendingEventInstance(
  input: CreatePendingEventInstanceInput,
): PendingRevealEventInstance {
  assertNonEmptyString(input.instanceId, "instanceId");
  assertOptionalNonEmptyString(input.triggeringPlayerId, "triggeringPlayerId");
  assertPositiveSafeInteger(input.triggeredAtTurn, "triggeredAtTurn");
  assertUniqueNonEmptyStrings(input.candidate.sourcePoolIds, "candidate.sourcePoolIds");

  if (input.candidate.event.revealMode === "OPTIONAL" && input.triggeringPlayerId === null) {
    throw new Error("Optional reveal events require a triggering player");
  }

  return {
    instanceId: input.instanceId,
    eventId: input.candidate.event.eventId,
    triggeringPlayerId: input.triggeringPlayerId,
    sourcePoolIds: [...input.candidate.sourcePoolIds],
    triggeredAtTurn: input.triggeredAtTurn,
    status: "PENDING_REVEAL",
  };
}

/**
 * 方法名：validateEventInstance
 * 作用：校验事件运行时实例的基础字段与状态专属时间。
 * @param instance 需要校验的事件运行时实例。
 * @returns 无返回值。
 * @throws 基础字段、状态或状态时间非法时抛出错误。
 */
export function validateEventInstance(instance: EventInstance): void {
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.eventId, "eventId");
  assertOptionalNonEmptyString(instance.triggeringPlayerId, "triggeringPlayerId");
  assertUniqueNonEmptyStrings(instance.sourcePoolIds, "sourcePoolIds");
  assertPositiveSafeInteger(instance.triggeredAtTurn, "triggeredAtTurn");

  if (!EVENT_INSTANCE_STATUSES.includes(instance.status)) {
    throw new RangeError(`Unsupported event instance status: ${String(instance.status)}`);
  }

  if (instance.status === "REVEALED") {
    assertTransitionTurn(instance.revealedAtTurn, instance.triggeredAtTurn, "revealedAtTurn");
  }

  if (instance.status === "DECLINED") {
    assertTransitionTurn(instance.declinedAtTurn, instance.triggeredAtTurn, "declinedAtTurn");
  }
}

/**
 * 方法名：assertTransitionTurn
 * 作用：校验状态迁移回合不早于事件触发回合。
 * @param transitionTurn 状态迁移发生的回合。
 * @param triggeredAtTurn 事件最初触发的回合。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 状态迁移回合非法或早于触发回合时抛出错误。
 */
function assertTransitionTurn(
  transitionTurn: number,
  triggeredAtTurn: number,
  field: string,
): void {
  assertPositiveSafeInteger(transitionTurn, field);

  if (transitionTurn < triggeredAtTurn) {
    throw new RangeError(`${field} must not be earlier than triggeredAtTurn`);
  }
}

/**
 * 方法名：assertUniqueNonEmptyStrings
 * 作用：校验字符串数组中的内容非空且不重复。
 * @param values 需要校验的字符串数组。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数组为空、包含空字符串或重复内容时抛出错误。
 */
function assertUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  if (values.length === 0) {
    throw new Error(`${field} must contain at least one value`);
  }

  const uniqueValues = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    uniqueValues.add(value);
  }
}

/**
 * 方法名：assertOptionalNonEmptyString
 * 作用：校验可空字符串在存在时包含有效内容。
 * @param value 需要校验的可空字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 非空值仅包含空白字符时抛出错误。
 */
function assertOptionalNonEmptyString(value: string | null, field: string): void {
  if (value !== null) {
    assertNonEmptyString(value, field);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验字符串包含有效的非空内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空或仅包含空白字符时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
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
