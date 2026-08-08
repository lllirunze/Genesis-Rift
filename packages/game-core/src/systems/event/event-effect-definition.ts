import {
  EVENT_EFFECT_ALLOWED_TARGET_TYPES,
  EVENT_EFFECT_FAILURE_POLICIES,
  EVENT_EFFECT_IDS,
  EVENT_EFFECT_TARGET_TYPES,
} from "./event-effect-config.ts";

/** 描述事件定义可以引用的标准效果处理器标识。 */
export type EventEffectId = (typeof EVENT_EFFECT_IDS)[number];

/** 描述事件效果在运行时解析的目标类别。 */
export type EventEffectTargetType = (typeof EVENT_EFFECT_TARGET_TYPES)[number];

/** 描述单项事件效果执行失败后的后续处理方式。 */
export type EventEffectFailurePolicy = (typeof EVENT_EFFECT_FAILURE_POLICIES)[number];

/** 定义各标准事件效果所需的类型安全参数。 */
export interface EventEffectParametersById {
  readonly "characterResource.modify": {
    readonly resourceId: string;
    readonly amount: number;
  };
  readonly "coin.modify": {
    readonly amount: number;
  };
  readonly "item.obtain": {
    readonly itemDefinitionId: string;
    readonly quantity: number;
  };
  readonly "item.obtainFromPool": {
    readonly itemPoolId: string;
    readonly drawCount: number;
  };
  readonly "status.add": {
    readonly statusDefinitionId: string;
    readonly stacks: number;
  };
  readonly "battle.start": {
    readonly encounterDefinitionId: string;
  };
  readonly "weather.change": {
    readonly weatherId: string;
    readonly durationRounds?: number;
  };
  readonly "movement.teleport": {
    readonly destinationTileId: string;
  };
}

/** 定义各标准事件效果允许使用的目标类别。 */
export interface EventEffectTargetTypeById {
  readonly "characterResource.modify": "TRIGGER_PLAYER" | "ALL_PLAYERS";
  readonly "coin.modify": "TRIGGER_PLAYER" | "ALL_PLAYERS";
  readonly "item.obtain": "TRIGGER_PLAYER";
  readonly "item.obtainFromPool": "TRIGGER_PLAYER";
  readonly "status.add": "TRIGGER_PLAYER" | "ALL_PLAYERS";
  readonly "battle.start": "TRIGGER_PLAYER";
  readonly "weather.change": "CURRENT_REGION" | "WORLD";
  readonly "movement.teleport": "TRIGGER_PLAYER";
}

/** 描述事件效果序列中一项具有稳定局部标识的标准效果。 */
export type EventEffectDefinition = {
  readonly [EffectId in EventEffectId]: {
    readonly effectKey: string;
    readonly effectId: EffectId;
    readonly targetType: EventEffectTargetTypeById[EffectId];
    readonly parameters: EventEffectParametersById[EffectId];
    readonly failurePolicy: EventEffectFailurePolicy;
  };
}[EventEffectId];

/**
 * 方法名：validateEventEffectDefinition
 * 作用：校验单项标准事件效果的标识、目标、参数与失败策略。
 * @param effect 需要校验的事件效果定义。
 * @returns 无返回值。
 * @throws 效果字段、目标类别或参数不满足约束时抛出错误。
 */
export function validateEventEffectDefinition(effect: EventEffectDefinition): void {
  const candidate = effect as unknown as {
    readonly effectKey: string;
    readonly effectId: string;
    readonly targetType: string;
    readonly parameters: unknown;
    readonly failurePolicy: string;
  };

  assertNonEmptyString(candidate.effectKey, "effectKey");

  if (!(EVENT_EFFECT_IDS as readonly string[]).includes(candidate.effectId)) {
    throw new RangeError(`Unsupported event effect id: ${candidate.effectId}`);
  }

  if (!(EVENT_EFFECT_TARGET_TYPES as readonly string[]).includes(candidate.targetType)) {
    throw new RangeError(`Unsupported event effect target type: ${candidate.targetType}`);
  }

  const allowedTargetTypes = EVENT_EFFECT_ALLOWED_TARGET_TYPES[candidate.effectId as EventEffectId];

  if (!(allowedTargetTypes as readonly string[]).includes(candidate.targetType)) {
    throw new RangeError(
      `Event effect ${candidate.effectId} does not support target type ${candidate.targetType}`,
    );
  }

  if (!(EVENT_EFFECT_FAILURE_POLICIES as readonly string[]).includes(candidate.failurePolicy)) {
    throw new RangeError(`Unsupported event effect failure policy: ${candidate.failurePolicy}`);
  }

  const parameters = assertParameterRecord(candidate.parameters, candidate.effectId);

  switch (candidate.effectId as EventEffectId) {
    case "characterResource.modify":
      assertExactParameterKeys(parameters, ["resourceId", "amount"], candidate.effectId);
      assertNonEmptyStringParameter(
        parameters.resourceId,
        `${candidate.effectId}.parameters.resourceId`,
      );
      assertNonZeroSafeInteger(parameters.amount, `${candidate.effectId}.parameters.amount`);
      return;
    case "coin.modify":
      assertExactParameterKeys(parameters, ["amount"], candidate.effectId);
      assertNonZeroSafeInteger(parameters.amount, `${candidate.effectId}.parameters.amount`);
      return;
    case "item.obtain":
      assertExactParameterKeys(parameters, ["itemDefinitionId", "quantity"], candidate.effectId);
      assertNonEmptyStringParameter(
        parameters.itemDefinitionId,
        `${candidate.effectId}.parameters.itemDefinitionId`,
      );
      assertPositiveSafeInteger(parameters.quantity, `${candidate.effectId}.parameters.quantity`);
      return;
    case "item.obtainFromPool":
      assertExactParameterKeys(parameters, ["itemPoolId", "drawCount"], candidate.effectId);
      assertNonEmptyStringParameter(
        parameters.itemPoolId,
        `${candidate.effectId}.parameters.itemPoolId`,
      );
      assertPositiveSafeInteger(parameters.drawCount, `${candidate.effectId}.parameters.drawCount`);
      return;
    case "status.add":
      assertExactParameterKeys(parameters, ["statusDefinitionId", "stacks"], candidate.effectId);
      assertNonEmptyStringParameter(
        parameters.statusDefinitionId,
        `${candidate.effectId}.parameters.statusDefinitionId`,
      );
      assertPositiveSafeInteger(parameters.stacks, `${candidate.effectId}.parameters.stacks`);
      return;
    case "battle.start":
      validateSingleStringParameter(parameters, "encounterDefinitionId", candidate.effectId);
      return;
    case "weather.change":
      assertAllowedParameterKeys(
        parameters,
        ["weatherId", "durationRounds"],
        ["weatherId"],
        candidate.effectId,
      );
      assertNonEmptyStringParameter(
        parameters.weatherId,
        `${candidate.effectId}.parameters.weatherId`,
      );

      if (parameters.durationRounds !== undefined) {
        assertPositiveSafeInteger(
          parameters.durationRounds,
          `${candidate.effectId}.parameters.durationRounds`,
        );
      }
      return;
      return;
    case "movement.teleport":
      validateSingleStringParameter(parameters, "destinationTileId", candidate.effectId);
  }
}

/**
 * 方法名：validateEventEffectDefinitions
 * 作用：校验事件效果序列并保证局部效果标识不重复。
 * @param effects 需要校验的事件效果序列。
 * @returns 无返回值。
 * @throws 任意效果非法或局部效果标识重复时抛出错误。
 */
export function validateEventEffectDefinitions(effects: readonly EventEffectDefinition[]): void {
  const effectKeys = new Set<string>();

  for (const effect of effects) {
    validateEventEffectDefinition(effect);

    if (effectKeys.has(effect.effectKey)) {
      throw new Error(`Duplicate event effect key: ${effect.effectKey}`);
    }

    effectKeys.add(effect.effectKey);
  }
}

/**
 * 方法名：validateSingleStringParameter
 * 作用：校验只包含一个非空字符串参数的事件效果。
 * @param parameters 效果参数对象。
 * @param parameterName 唯一允许的参数名称。
 * @param effectId 出现在错误信息中的效果标识。
 * @returns 无返回值。
 * @throws 参数键或参数值非法时抛出错误。
 */
function validateSingleStringParameter(
  parameters: Readonly<Record<string, unknown>>,
  parameterName: string,
  effectId: string,
): void {
  assertExactParameterKeys(parameters, [parameterName], effectId);
  assertNonEmptyStringParameter(
    parameters[parameterName],
    `${effectId}.parameters.${parameterName}`,
  );
}

/**
 * 方法名：assertParameterRecord
 * 作用：校验效果参数为普通对象并返回只读参数视图。
 * @param value 需要校验的参数值。
 * @param effectId 出现在错误信息中的效果标识。
 * @returns 可继续校验的只读参数对象。
 * @throws 参数不是普通对象时抛出错误。
 */
function assertParameterRecord(
  value: unknown,
  effectId: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${effectId}.parameters must be an object`);
  }

  return value as Readonly<Record<string, unknown>>;
}

/**
 * 方法名：assertExactParameterKeys
 * 作用：校验效果参数只包含指定键且没有缺失项。
 * @param parameters 效果参数对象。
 * @param expectedKeys 当前效果允许的全部参数键。
 * @param effectId 出现在错误信息中的效果标识。
 * @returns 无返回值。
 * @throws 参数键缺失或包含额外内容时抛出错误。
 */
function assertExactParameterKeys(
  parameters: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  effectId: string,
): void {
  const actualKeys = Object.keys(parameters).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(
      `${effectId}.parameters must contain exactly: ${sortedExpectedKeys.join(", ")}`,
    );
  }
}

/**
 * 方法名：assertAllowedParameterKeys
 * 作用：校验参数只包含允许键，并确保所有必填键存在。
 * @param parameters 需要校验的参数对象。
 * @param allowedKeys 允许出现的全部参数键。
 * @param requiredKeys 必须出现的参数键。
 * @param effectId 当前效果标识。
 * @returns 无返回值。
 */
function assertAllowedParameterKeys(
  parameters: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  effectId: string,
): void {
  const actualKeys = Object.keys(parameters);

  if (
    actualKeys.some((key) => !allowedKeys.includes(key)) ||
    requiredKeys.some((key) => !actualKeys.includes(key))
  ) {
    throw new Error(
      `${effectId}.parameters may contain ${allowedKeys.join(", ")} and must contain ${requiredKeys.join(", ")}`,
    );
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
 * 方法名：assertNonEmptyStringParameter
 * 作用：校验效果参数值为非空字符串。
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
 * 方法名：assertNonZeroSafeInteger
 * 作用：校验效果参数值为非零安全整数。
 * @param value 需要校验的参数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是非零安全整数时抛出错误。
 */
function assertNonZeroSafeInteger(value: unknown, field: string): asserts value is number {
  if (!Number.isSafeInteger(value) || value === 0) {
    throw new RangeError(`${field} must be a non-zero safe integer`);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验效果参数值为正安全整数。
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
