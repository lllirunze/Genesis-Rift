import {
  validateEventConditionExpression,
  type EventConditionExpression,
} from "./event-condition-definition.ts";
import {
  EVENT_DURATION_REPEAT_POLICIES,
  EVENT_DURATION_TYPES,
  EVENT_DURATION_UPDATE_TIMINGS,
} from "./event-duration-config.ts";

/** 描述事件采用的持续方式。 */
export type EventDurationType = (typeof EVENT_DURATION_TYPES)[number];

/** 描述持续事件进行时间推进或结束检查的时机。 */
export type EventDurationUpdateTiming = (typeof EVENT_DURATION_UPDATE_TIMINGS)[number];

/** 描述相同持续事件再次生效时的处理策略。 */
export type EventDurationRepeatPolicy = (typeof EVENT_DURATION_REPEAT_POLICIES)[number];

/** 描述不允许叠加时采用的持续事件重复处理方式。 */
export interface NonStackingEventDurationRepeatDefinition {
  readonly policy: Exclude<EventDurationRepeatPolicy, "STACK">;
}

/** 描述允许多个同类持续事件实例同时存在的重复处理方式。 */
export interface StackingEventDurationRepeatDefinition {
  readonly policy: "STACK";
  readonly maximumInstances: number;
}

/** 描述相同持续事件再次生效时的完整处理规则。 */
export type EventDurationRepeatDefinition =
  NonStackingEventDurationRepeatDefinition | StackingEventDurationRepeatDefinition;

/** 描述结算完成后不保留运行时实例的即时事件。 */
export interface ImmediateEventDurationDefinition {
  readonly type: "IMMEDIATE";
}

/** 描述持续指定完整回合数的事件。 */
export interface FixedRoundsEventDurationDefinition {
  readonly type: "FIXED_ROUNDS";
  readonly rounds: number;
  readonly updateTiming: EventDurationUpdateTiming;
  readonly repeat: EventDurationRepeatDefinition;
}

/** 描述持续至指定条件成立的事件。 */
export interface UntilConditionEventDurationDefinition {
  readonly type: "UNTIL_CONDITION";
  readonly endCondition: EventConditionExpression;
  readonly updateTiming: EventDurationUpdateTiming;
  readonly repeat: EventDurationRepeatDefinition;
}

/** 描述跟随指定世界事件生命周期的持续事件。 */
export interface UntilWorldEventEndDurationDefinition {
  readonly type: "UNTIL_WORLD_EVENT_END";
  readonly worldEventId: string;
  readonly repeat: EventDurationRepeatDefinition;
}

/** 描述在本局游戏中不会自动结束的永久事件。 */
export interface PermanentEventDurationDefinition {
  readonly type: "PERMANENT";
  readonly repeat: EventDurationRepeatDefinition;
}

/** 描述事件结算后采用的完整持续规则。 */
export type EventDurationDefinition =
  | ImmediateEventDurationDefinition
  | FixedRoundsEventDurationDefinition
  | UntilConditionEventDurationDefinition
  | UntilWorldEventEndDurationDefinition
  | PermanentEventDurationDefinition;

/**
 * 方法名：validateEventDurationDefinition
 * 作用：校验事件持续类型、时间配置、结束条件与重复处理规则。
 * @param duration 需要校验的事件持续规则。
 * @returns 无返回值。
 * @throws 持续类型、回合数、结束条件、更新时间或重复策略非法时抛出错误。
 */
export function validateEventDurationDefinition(duration: EventDurationDefinition): void {
  if (!EVENT_DURATION_TYPES.includes(duration.type)) {
    throw new RangeError(`Unsupported event duration type: ${String(duration.type)}`);
  }

  switch (duration.type) {
    case "IMMEDIATE":
      return;
    case "FIXED_ROUNDS":
      assertPositiveSafeInteger(duration.rounds, "duration.rounds");
      validateUpdateTiming(duration.updateTiming);
      validateEventDurationRepeatDefinition(duration.repeat);
      return;
    case "UNTIL_CONDITION":
      validateEventConditionExpression(duration.endCondition);
      validateUpdateTiming(duration.updateTiming);
      validateEventDurationRepeatDefinition(duration.repeat);
      assertRepeatPolicyIsNotRefresh(duration.repeat, duration.type);
      return;
    case "UNTIL_WORLD_EVENT_END":
      assertNonEmptyString(duration.worldEventId, "duration.worldEventId");
      validateEventDurationRepeatDefinition(duration.repeat);
      assertRepeatPolicyIsNotRefresh(duration.repeat, duration.type);
      return;
    case "PERMANENT":
      validateEventDurationRepeatDefinition(duration.repeat);
      assertRepeatPolicyIsNotRefresh(duration.repeat, duration.type);
  }
}

/**
 * 方法名：assertRepeatPolicyIsNotRefresh
 * 作用：阻止没有剩余回合数的持续类型使用刷新策略。
 * @param repeat 需要校验的持续事件重复处理规则。
 * @param durationType 出现在错误信息中的持续类型。
 * @returns 无返回值。
 * @throws 重复策略为刷新时抛出错误。
 */
function assertRepeatPolicyIsNotRefresh(
  repeat: EventDurationRepeatDefinition,
  durationType: Exclude<EventDurationType, "IMMEDIATE" | "FIXED_ROUNDS">,
): void {
  if (repeat.policy === "REFRESH") {
    throw new Error(`${durationType} event durations cannot use the REFRESH repeat policy`);
  }
}

/**
 * 方法名：validateEventDurationRepeatDefinition
 * 作用：校验持续事件的重复生效策略及叠加实例上限。
 * @param repeat 需要校验的持续事件重复处理规则。
 * @returns 无返回值。
 * @throws 重复策略不受支持或叠加实例上限非法时抛出错误。
 */
export function validateEventDurationRepeatDefinition(repeat: EventDurationRepeatDefinition): void {
  if (!EVENT_DURATION_REPEAT_POLICIES.includes(repeat.policy)) {
    throw new RangeError(`Unsupported event duration repeat policy: ${String(repeat.policy)}`);
  }

  if (repeat.policy === "STACK") {
    assertPositiveSafeInteger(repeat.maximumInstances, "duration.repeat.maximumInstances");
  }
}

/**
 * 方法名：validateUpdateTiming
 * 作用：校验持续事件使用受支持的更新时间点。
 * @param updateTiming 需要校验的持续事件更新时间点。
 * @returns 无返回值。
 * @throws 更新时间点不受支持时抛出错误。
 */
function validateUpdateTiming(updateTiming: EventDurationUpdateTiming): void {
  if (!EVENT_DURATION_UPDATE_TIMINGS.includes(updateTiming)) {
    throw new RangeError(`Unsupported event duration update timing: ${updateTiming}`);
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
