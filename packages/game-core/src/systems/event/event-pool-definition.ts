import type { EventDefinitionCatalog } from "./event-definition.ts";

/** 描述事件池对一项事件的引用与整数权重修正。 */
export interface EventPoolEntryDefinition {
  readonly eventId: string;
  readonly weightAdjustment: number;
}

/** 描述一个区域、场景或触发来源可以提供的事件集合。 */
export interface EventPoolDefinition {
  readonly poolId: string;
  readonly name: string;
  readonly entries: readonly EventPoolEntryDefinition[];
}

/** 描述以事件池标识索引的只读事件池注册表。 */
export type EventPoolDefinitionCatalog = Readonly<Record<string, EventPoolDefinition>>;

/**
 * 方法名：validateEventPoolDefinition
 * 作用：校验单个事件池字段、事件引用、权重修正及池内唯一性。
 * @param definition 需要校验的事件池定义。
 * @param eventCatalog 事件池引用的事件定义注册表。
 * @returns 无返回值。
 * @throws 字段、事件引用、权重修正或池内唯一性非法时抛出错误。
 */
export function validateEventPoolDefinition(
  definition: EventPoolDefinition,
  eventCatalog: EventDefinitionCatalog,
): void {
  assertNonEmptyString(definition.poolId, "poolId");
  assertNonEmptyString(definition.name, "name");

  if (definition.entries.length === 0) {
    throw new Error("Event pools must contain at least one entry");
  }

  const eventIds = new Set<string>();

  for (const entry of definition.entries) {
    assertNonEmptyString(entry.eventId, "entries.eventId");
    assertSafeInteger(entry.weightAdjustment, "entries.weightAdjustment");

    if (eventCatalog[entry.eventId] === undefined) {
      throw new Error(`Event pool references unknown event: ${entry.eventId}`);
    }

    if (eventIds.has(entry.eventId)) {
      throw new Error(`Duplicate event pool entry: ${entry.eventId}`);
    }

    eventIds.add(entry.eventId);
  }
}

/**
 * 方法名：validateEventPoolDefinitionCatalog
 * 作用：校验事件池注册表键值一致性及所有事件池定义。
 * @param catalog 需要校验的事件池定义注册表。
 * @param eventCatalog 事件池引用的事件定义注册表。
 * @returns 无返回值。
 * @throws 注册表键值不一致或任意事件池非法时抛出错误。
 */
export function validateEventPoolDefinitionCatalog(
  catalog: EventPoolDefinitionCatalog,
  eventCatalog: EventDefinitionCatalog,
): void {
  for (const [poolId, definition] of Object.entries(catalog)) {
    validateEventPoolDefinition(definition, eventCatalog);

    if (poolId !== definition.poolId) {
      throw new Error(
        `Event pool catalog key ${poolId} does not match pool id ${definition.poolId}`,
      );
    }
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
 * 方法名：assertSafeInteger
 * 作用：校验权重修正为安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值不是安全整数时抛出错误。
 */
function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
}
