import { isStandardQuality, type StandardQuality } from "@genesis-rift/shared";

import {
  validateEventConditionExpression,
  type EventConditionExpression,
} from "./event-condition-definition.ts";
import { EVENT_CATEGORIES, EVENT_REPEAT_RULES, EVENT_REVEAL_MODES } from "./event-config.ts";
import {
  validateEventDurationDefinition,
  type EventDurationDefinition,
} from "./event-duration-definition.ts";
import {
  validateEventResolutionDefinition,
  type EventResolutionDefinition,
} from "./event-resolution-definition.ts";

/** 描述事件的主要作用与内容定位。 */
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** 描述事件抽取后采用的揭露方式。 */
export type EventRevealMode = (typeof EVENT_REVEAL_MODES)[number];

/** 描述事件在单局游戏中的重复触发规则。 */
export type EventRepeatRule = (typeof EVENT_REPEAT_RULES)[number];

/** 描述事件不随运行过程改变的基础静态定义。 */
export interface EventDefinition {
  readonly eventId: string;
  readonly name: string;
  readonly description: string;
  readonly triggerCondition: EventConditionExpression | null;
  readonly category: EventCategory;
  readonly rarity: StandardQuality;
  readonly tags: readonly string[];
  readonly revealMode: EventRevealMode;
  readonly repeatRule: EventRepeatRule;
  readonly resolution: EventResolutionDefinition;
  readonly duration: EventDurationDefinition;
  readonly baseWeight: number;
  readonly cooldownTurns: number;
}

/** 描述以事件标识索引的只读事件定义注册表。 */
export type EventDefinitionCatalog = Readonly<Record<string, EventDefinition>>;

/**
 * 方法名：validateEventDefinition
 * 作用：校验单项事件基础定义的字段与枚举值是否合法。
 * @param definition 需要校验的事件静态定义。
 * @returns 无返回值。
 * @throws 字段为空、枚举值不受支持或整数配置非法时抛出错误。
 */
export function validateEventDefinition(definition: EventDefinition): void {
  assertNonEmptyString(definition.eventId, "eventId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");
  assertUniqueNonEmptyStrings(definition.tags, "tags");

  if (definition.triggerCondition !== null) {
    validateEventConditionExpression(definition.triggerCondition);
  }

  if (!EVENT_CATEGORIES.includes(definition.category)) {
    throw new RangeError(`Unsupported event category: ${definition.category}`);
  }

  if (!isStandardQuality(definition.rarity)) {
    throw new RangeError(`Unsupported event rarity: ${definition.rarity}`);
  }

  if (!EVENT_REVEAL_MODES.includes(definition.revealMode)) {
    throw new RangeError(`Unsupported event reveal mode: ${definition.revealMode}`);
  }

  if (!EVENT_REPEAT_RULES.includes(definition.repeatRule)) {
    throw new RangeError(`Unsupported event repeat rule: ${definition.repeatRule}`);
  }

  validateEventResolutionDefinition(definition.resolution);
  validateEventDurationDefinition(definition.duration);

  assertNonNegativeSafeInteger(definition.baseWeight, "baseWeight");
  assertNonNegativeSafeInteger(definition.cooldownTurns, "cooldownTurns");
}

/**
 * 方法名：validateEventDefinitions
 * 作用：校验事件定义集合，并保证事件标识全局唯一。
 * @param definitions 需要校验的事件静态定义集合。
 * @returns 无返回值。
 * @throws 任意定义非法或事件标识重复时抛出错误。
 */
export function validateEventDefinitions(definitions: readonly EventDefinition[]): void {
  const eventIds = new Set<string>();

  for (const definition of definitions) {
    validateEventDefinition(definition);

    if (eventIds.has(definition.eventId)) {
      throw new Error(`Duplicate event id: ${definition.eventId}`);
    }

    eventIds.add(definition.eventId);
  }
}

/**
 * 方法名：validateEventDefinitionCatalog
 * 作用：校验事件定义注册表中的键值一致性及所有事件定义。
 * @param catalog 需要校验的事件定义注册表。
 * @returns 无返回值。
 * @throws 注册表键与事件标识不一致或任意定义非法时抛出错误。
 */
export function validateEventDefinitionCatalog(catalog: EventDefinitionCatalog): void {
  validateEventDefinitions(Object.values(catalog));

  for (const [eventId, definition] of Object.entries(catalog)) {
    if (eventId !== definition.eventId) {
      throw new Error(`Event catalog key ${eventId} does not match event id ${definition.eventId}`);
    }
  }
}

/**
 * 方法名：getEventDefinition
 * 作用：根据事件标识读取对应的静态定义。
 * @param catalog 事件定义注册表。
 * @param eventId 需要查询的事件标识。
 * @returns 与事件标识对应的静态定义。
 * @throws 事件标识不存在时抛出错误。
 */
export function getEventDefinition(
  catalog: EventDefinitionCatalog,
  eventId: string,
): EventDefinition {
  const definition = catalog[eventId];

  if (definition === undefined) {
    throw new Error(`Unknown event definition: ${eventId}`);
  }

  return definition;
}

/**
 * 方法名：assertUniqueNonEmptyStrings
 * 作用：校验字符串配置数组中的内容非空且不重复。
 * @param values 需要校验的字符串数组。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数组包含空字符串或重复内容时抛出错误。
 */
function assertUniqueNonEmptyStrings(values: readonly string[], field: string): void {
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
