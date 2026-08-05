import {
  validateEventConditionExpression,
  type EventConditionExpression,
} from "./event-condition-definition.ts";
import {
  validateEventEffectDefinitions,
  type EventEffectDefinition,
} from "./event-effect-definition.ts";

/** 描述玩家在已揭露事件中可以选择的一项行动。 */
export interface EventOptionDefinition {
  readonly optionId: string;
  readonly name: string;
  readonly description: string;
  readonly availabilityCondition: EventConditionExpression | null;
  readonly effects: readonly EventEffectDefinition[];
}

/** 描述无需玩家选择、揭露后直接生成效果的事件。 */
export interface DirectEventResolutionDefinition {
  readonly type: "DIRECT";
  readonly effects: readonly EventEffectDefinition[];
}

/** 描述揭露后需要玩家从多个选项中作出选择的事件。 */
export interface ChoiceEventResolutionDefinition {
  readonly type: "CHOICE";
  readonly options: readonly EventOptionDefinition[];
}

/** 描述事件揭露后的静态结算结构。 */
export type EventResolutionDefinition =
  DirectEventResolutionDefinition | ChoiceEventResolutionDefinition;

/**
 * 方法名：validateEventResolutionDefinition
 * 作用：校验事件使用直接效果或玩家选项形成的结算结构。
 * @param resolution 需要校验的事件结算定义。
 * @returns 无返回值。
 * @throws 结算类型、效果列表、选项数量或选项字段非法时抛出错误。
 */
export function validateEventResolutionDefinition(resolution: EventResolutionDefinition): void {
  if (resolution.type === "DIRECT") {
    if (resolution.effects.length === 0) {
      throw new Error("Direct events must contain at least one effect");
    }

    validateEventEffectDefinitions(resolution.effects);
    return;
  }

  if (resolution.options.length < 2) {
    throw new Error("Choice events must declare at least two options");
  }

  const optionIds = new Set<string>();

  for (const option of resolution.options) {
    validateEventOptionDefinition(option);

    if (optionIds.has(option.optionId)) {
      throw new Error(`Duplicate event option id: ${option.optionId}`);
    }

    optionIds.add(option.optionId);
  }
}

/**
 * 方法名：validateEventOptionDefinition
 * 作用：校验单项事件选项的文本、可用条件与效果列表。
 * @param option 需要校验的事件选项定义。
 * @returns 无返回值。
 * @throws 选项字段、条件或效果列表非法时抛出错误。
 */
export function validateEventOptionDefinition(option: EventOptionDefinition): void {
  assertNonEmptyString(option.optionId, "optionId");
  assertNonEmptyString(option.name, "name");
  assertNonEmptyString(option.description, "description");

  if (option.availabilityCondition !== null) {
    validateEventConditionExpression(option.availabilityCondition);
  }

  validateEventEffectDefinitions(option.effects);
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
