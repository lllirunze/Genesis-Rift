import {
  EVENT_CONDITION_GROUP_OPERATORS,
  EVENT_CONDITION_IDS,
  MAX_EVENT_CONDITION_GROUP_DEPTH,
} from "./event-condition-config.ts";

/** 描述事件定义能够引用的基础触发条件标识。 */
export type EventConditionId = (typeof EVENT_CONDITION_IDS)[number];

/** 描述事件条件组内多个子条件之间的逻辑关系。 */
export type EventConditionGroupOperator = (typeof EVENT_CONDITION_GROUP_OPERATORS)[number];

/** 定义各基础触发条件所需的类型安全参数。 */
export interface EventConditionParametersById {
  readonly "map.regionIs": {
    readonly regionDefinitionId: string;
  };
  readonly "map.terrainIs": {
    readonly terrainDefinitionId: string;
  };
  readonly "map.featureIs": {
    readonly featureId: string;
  };
  readonly "weather.is": {
    readonly weatherId: string;
  };
  readonly "time.is": {
    readonly periodId: string;
  };
  readonly "player.levelAtLeast": {
    readonly level: number;
  };
  readonly "player.isNotInBattle": Record<string, never>;
  readonly "player.identityIs": {
    readonly identityId: string;
  };
  readonly "player.raceIs": {
    readonly raceId: string;
  };
  readonly "player.faithIs": {
    readonly faithId: string;
  };
  readonly "quest.stageIs": {
    readonly questId: string;
    readonly stageId: string;
  };
  readonly "dungeon.is": {
    readonly dungeonId: string;
  };
  readonly "world.stateIs": {
    readonly stateId: string;
  };
  readonly "inventory.hasItem": {
    readonly itemDefinitionId: string;
    readonly quantity: number;
  };
  readonly "equipment.has": {
    readonly equipmentDefinitionId: string;
  };
  readonly "resource.atLeast": {
    readonly resourceId: string;
    readonly amount: number;
  };
  readonly "event.wasRevealed": {
    readonly eventId: string;
  };
  readonly "event.wasNotRevealed": {
    readonly eventId: string;
  };
  readonly "exploration.isFirstVisit": Record<string, never>;
}

/** 描述一项不产生副作用的基础事件触发条件。 */
export type EventAtomicConditionDefinition = {
  readonly [ConditionId in EventConditionId]: {
    readonly type: "CONDITION";
    readonly conditionId: ConditionId;
    readonly parameters: EventConditionParametersById[ConditionId];
  };
}[EventConditionId];

/** 描述由多个基础条件或子条件组组成的逻辑条件。 */
export interface EventConditionGroupDefinition {
  readonly type: "GROUP";
  readonly operator: EventConditionGroupOperator;
  readonly conditions: readonly EventConditionExpression[];
}

/** 描述事件触发条件树中的任意节点。 */
export type EventConditionExpression =
  EventAtomicConditionDefinition | EventConditionGroupDefinition;

/**
 * 方法名：validateEventConditionExpression
 * 作用：递归校验事件触发条件的标识、参数、逻辑组与嵌套深度。
 * @param expression 需要校验的事件触发条件表达式。
 * @returns 无返回值。
 * @throws 条件标识、参数、逻辑组或嵌套结构非法时抛出错误。
 */
export function validateEventConditionExpression(expression: EventConditionExpression): void {
  validateExpressionNode(expression, 0, new Set<object>());
}

/**
 * 方法名：validateExpressionNode
 * 作用：校验单个条件节点，并递归处理其子条件。
 * @param expression 当前需要校验的条件节点。
 * @param depth 当前条件节点所在的嵌套深度。
 * @param ancestors 当前递归路径中已经访问的节点集合。
 * @returns 无返回值。
 * @throws 条件树循环引用、超过深度限制或节点内容非法时抛出错误。
 */
function validateExpressionNode(
  expression: EventConditionExpression,
  depth: number,
  ancestors: Set<object>,
): void {
  if (depth > MAX_EVENT_CONDITION_GROUP_DEPTH) {
    throw new RangeError(
      `Event condition group depth must not exceed ${MAX_EVENT_CONDITION_GROUP_DEPTH}`,
    );
  }

  if (ancestors.has(expression)) {
    throw new Error("Event condition expression must not contain circular references");
  }

  if (expression.type === "CONDITION") {
    validateAtomicCondition(expression);
    return;
  }

  if (!EVENT_CONDITION_GROUP_OPERATORS.includes(expression.operator)) {
    throw new RangeError(`Unsupported event condition group operator: ${expression.operator}`);
  }

  if (expression.conditions.length === 0) {
    throw new Error("Event condition groups must contain at least one condition");
  }

  ancestors.add(expression);

  for (const condition of expression.conditions) {
    validateExpressionNode(condition, depth + 1, ancestors);
  }

  ancestors.delete(expression);
}

/**
 * 方法名：validateAtomicCondition
 * 作用：校验基础条件标识及其对应参数。
 * @param condition 需要校验的基础事件条件。
 * @returns 无返回值。
 * @throws 条件标识不受支持或参数结构非法时抛出错误。
 */
function validateAtomicCondition(condition: EventAtomicConditionDefinition): void {
  const candidate = condition as unknown as {
    readonly conditionId: string;
    readonly parameters: unknown;
  };

  if (!(EVENT_CONDITION_IDS as readonly string[]).includes(candidate.conditionId)) {
    throw new RangeError(`Unsupported event condition id: ${candidate.conditionId}`);
  }

  const parameters = assertParameterRecord(candidate.parameters, candidate.conditionId);

  switch (candidate.conditionId as EventConditionId) {
    case "map.regionIs":
      validateSingleStringParameter(parameters, "regionDefinitionId", candidate.conditionId);
      return;
    case "map.terrainIs":
      validateSingleStringParameter(parameters, "terrainDefinitionId", candidate.conditionId);
      return;
    case "map.featureIs":
      validateSingleStringParameter(parameters, "featureId", candidate.conditionId);
      return;
    case "weather.is":
      validateSingleStringParameter(parameters, "weatherId", candidate.conditionId);
      return;
    case "time.is":
      validateSingleStringParameter(parameters, "periodId", candidate.conditionId);
      return;
    case "player.identityIs":
      validateSingleStringParameter(parameters, "identityId", candidate.conditionId);
      return;
    case "player.raceIs":
      validateSingleStringParameter(parameters, "raceId", candidate.conditionId);
      return;
    case "player.faithIs":
      validateSingleStringParameter(parameters, "faithId", candidate.conditionId);
      return;
    case "dungeon.is":
      validateSingleStringParameter(parameters, "dungeonId", candidate.conditionId);
      return;
    case "world.stateIs":
      validateSingleStringParameter(parameters, "stateId", candidate.conditionId);
      return;
    case "equipment.has":
      validateSingleStringParameter(parameters, "equipmentDefinitionId", candidate.conditionId);
      return;
    case "event.wasRevealed":
    case "event.wasNotRevealed":
      validateSingleStringParameter(parameters, "eventId", candidate.conditionId);
      return;
    case "player.levelAtLeast":
      assertExactParameterKeys(parameters, ["level"], candidate.conditionId);
      assertPositiveSafeInteger(parameters.level, `${candidate.conditionId}.parameters.level`);
      return;
    case "player.isNotInBattle":
    case "exploration.isFirstVisit":
      assertExactParameterKeys(parameters, [], candidate.conditionId);
      return;
    case "quest.stageIs":
      assertExactParameterKeys(parameters, ["questId", "stageId"], candidate.conditionId);
      assertNonEmptyStringParameter(
        parameters.questId,
        `${candidate.conditionId}.parameters.questId`,
      );
      assertNonEmptyStringParameter(
        parameters.stageId,
        `${candidate.conditionId}.parameters.stageId`,
      );
      return;
    case "inventory.hasItem":
      assertExactParameterKeys(parameters, ["itemDefinitionId", "quantity"], candidate.conditionId);
      assertNonEmptyStringParameter(
        parameters.itemDefinitionId,
        `${candidate.conditionId}.parameters.itemDefinitionId`,
      );
      assertPositiveSafeInteger(
        parameters.quantity,
        `${candidate.conditionId}.parameters.quantity`,
      );
      return;
    case "resource.atLeast":
      assertExactParameterKeys(parameters, ["resourceId", "amount"], candidate.conditionId);
      assertNonEmptyStringParameter(
        parameters.resourceId,
        `${candidate.conditionId}.parameters.resourceId`,
      );
      assertNonNegativeSafeInteger(parameters.amount, `${candidate.conditionId}.parameters.amount`);
  }
}

/**
 * 方法名：validateSingleStringParameter
 * 作用：校验只包含一个非空字符串参数的基础条件。
 * @param parameters 条件参数对象。
 * @param parameterName 唯一允许的参数名称。
 * @param conditionId 出现在错误信息中的条件标识。
 * @returns 无返回值。
 * @throws 参数键或参数值非法时抛出错误。
 */
function validateSingleStringParameter(
  parameters: Readonly<Record<string, unknown>>,
  parameterName: string,
  conditionId: string,
): void {
  assertExactParameterKeys(parameters, [parameterName], conditionId);
  assertNonEmptyStringParameter(
    parameters[parameterName],
    `${conditionId}.parameters.${parameterName}`,
  );
}

/**
 * 方法名：assertParameterRecord
 * 作用：校验条件参数为普通对象并返回只读参数视图。
 * @param value 需要校验的参数值。
 * @param conditionId 出现在错误信息中的条件标识。
 * @returns 可继续校验的只读参数对象。
 * @throws 参数不是普通对象时抛出错误。
 */
function assertParameterRecord(
  value: unknown,
  conditionId: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${conditionId}.parameters must be an object`);
  }

  return value as Readonly<Record<string, unknown>>;
}

/**
 * 方法名：assertExactParameterKeys
 * 作用：校验条件参数只包含指定键且没有缺失项。
 * @param parameters 条件参数对象。
 * @param expectedKeys 当前条件允许的全部参数键。
 * @param conditionId 出现在错误信息中的条件标识。
 * @returns 无返回值。
 * @throws 参数键缺失或包含额外内容时抛出错误。
 */
function assertExactParameterKeys(
  parameters: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  conditionId: string,
): void {
  const actualKeys = Object.keys(parameters).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(
      `${conditionId}.parameters must contain exactly: ${sortedExpectedKeys.join(", ")}`,
    );
  }
}

/**
 * 方法名：assertNonEmptyStringParameter
 * 作用：校验条件参数值为非空字符串。
 * @param value 需要校验的参数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是非空字符串时抛出错误。
 */
function assertNonEmptyStringParameter(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验条件参数值为正安全整数。
 * @param value 需要校验的参数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是正安全整数时抛出错误。
 */
function assertPositiveSafeInteger(value: unknown, field: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验条件参数值为非负安全整数。
 * @param value 需要校验的参数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是非负安全整数时抛出错误。
 */
function assertNonNegativeSafeInteger(value: unknown, field: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
