import type { EventDurationType } from "./event-duration-definition.ts";

/** 描述所有持续事件实例共同保存的运行时信息。 */
interface ActiveEventDurationInstanceBase {
  readonly durationInstanceId: string;
  readonly eventId: string;
  readonly sourceEventInstanceId: string;
  readonly latestSourceEventInstanceId: string;
  readonly triggeringPlayerId: string | null;
  readonly startedAtTurn: number;
  readonly startedAtSequence: number;
  readonly lastUpdateSequence: number;
}

/** 描述按固定回合数持续的事件运行时实例。 */
export interface FixedRoundsEventDurationInstance extends ActiveEventDurationInstanceBase {
  readonly durationType: "FIXED_ROUNDS";
  readonly remainingRounds: number;
}

/** 描述持续至静态定义中指定条件成立的事件运行时实例。 */
export interface UntilConditionEventDurationInstance extends ActiveEventDurationInstanceBase {
  readonly durationType: "UNTIL_CONDITION";
}

/** 描述跟随指定世界事件生命周期的事件运行时实例。 */
export interface UntilWorldEventEndDurationInstance extends ActiveEventDurationInstanceBase {
  readonly durationType: "UNTIL_WORLD_EVENT_END";
}

/** 描述本局游戏内不会自动结束的事件运行时实例。 */
export interface PermanentEventDurationInstance extends ActiveEventDurationInstanceBase {
  readonly durationType: "PERMANENT";
}

/** 描述当前仍在生效的任意持续事件实例。 */
export type ActiveEventDurationInstance =
  | FixedRoundsEventDurationInstance
  | UntilConditionEventDurationInstance
  | UntilWorldEventEndDurationInstance
  | PermanentEventDurationInstance;

/** 描述持续事件结束的标准原因。 */
export type EventDurationEndReason = "EXPIRED" | "CONDITION_MET" | "WORLD_EVENT_ENDED" | "REPLACED";

/** 描述已经结束并可用于日志、回放和清理外部效果的持续事件记录。 */
export interface EndedEventDurationInstance {
  readonly durationInstanceId: string;
  readonly eventId: string;
  readonly sourceEventInstanceId: string;
  readonly latestSourceEventInstanceId: string;
  readonly triggeringPlayerId: string | null;
  readonly durationType: Exclude<EventDurationType, "IMMEDIATE">;
  readonly startedAtTurn: number;
  readonly endedAtTurn: number;
  readonly endedAtSequence: number;
  readonly reason: EventDurationEndReason;
}

/** 描述外部业务系统收到的持续效果清理指令。 */
export interface EventDurationEndInstruction {
  readonly durationInstanceId: string;
  readonly eventId: string;
  readonly reason: EventDurationEndReason;
}

/**
 * 方法名：validateActiveEventDurationInstance
 * 作用：校验持续事件实例的标识、时序以及固定回合剩余值。
 * @param instance 需要校验的持续事件运行时实例。
 * @returns 无返回值。
 * @throws 标识为空、时序非法或剩余回合数非法时抛出错误。
 */
export function validateActiveEventDurationInstance(instance: ActiveEventDurationInstance): void {
  const durationType = (instance as unknown as { readonly durationType: string }).durationType;

  if (
    durationType !== "FIXED_ROUNDS" &&
    durationType !== "UNTIL_CONDITION" &&
    durationType !== "UNTIL_WORLD_EVENT_END" &&
    durationType !== "PERMANENT"
  ) {
    throw new RangeError(`Unsupported active event duration type: ${durationType}`);
  }

  assertNonEmptyString(instance.durationInstanceId, "durationInstanceId");
  assertNonEmptyString(instance.eventId, "eventId");
  assertNonEmptyString(instance.sourceEventInstanceId, "sourceEventInstanceId");
  assertNonEmptyString(instance.latestSourceEventInstanceId, "latestSourceEventInstanceId");

  if (instance.triggeringPlayerId !== null) {
    assertNonEmptyString(instance.triggeringPlayerId, "triggeringPlayerId");
  }

  assertPositiveSafeInteger(instance.startedAtTurn, "startedAtTurn");
  assertNonNegativeSafeInteger(instance.startedAtSequence, "startedAtSequence");
  assertNonNegativeSafeInteger(instance.lastUpdateSequence, "lastUpdateSequence");

  if (instance.lastUpdateSequence < instance.startedAtSequence) {
    throw new RangeError("lastUpdateSequence must not be earlier than startedAtSequence");
  }

  if (instance.durationType === "FIXED_ROUNDS") {
    assertPositiveSafeInteger(instance.remainingRounds, "remainingRounds");
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验字符串包含有效内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空时抛出错误。
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

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验数值为非负安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值不是非负安全整数时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
