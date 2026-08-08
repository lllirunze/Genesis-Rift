import {
  assertResourceId,
  isStandardQuality,
  type ResourceId,
  type StandardQuality,
} from "@genesis-rift/shared";

import {
  HAND_CARD_CONDITION_IDS,
  HAND_CARD_DESTINATIONS,
  HAND_CARD_EFFECT_IDS,
  HAND_CARD_RESPONSE_TYPES,
  HAND_CARD_TARGET_TYPES,
  HAND_CARD_TYPES,
  HAND_CARD_USAGE_TIMINGS,
} from "./hand-card-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardType = (typeof HAND_CARD_TYPES)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardUsageTiming = (typeof HAND_CARD_USAGE_TIMINGS)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardResponseType = (typeof HAND_CARD_RESPONSE_TYPES)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardConditionId = (typeof HAND_CARD_CONDITION_IDS)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardTargetType = (typeof HAND_CARD_TARGET_TYPES)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardEffectId = (typeof HAND_CARD_EFFECT_IDS)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardEffectParametersById {
  readonly "attack.modifyHit": {
    readonly amount: number;
  };
  readonly "damage.reduce": {
    readonly amount: number;
  };
  readonly "health.restore": {
    readonly amount: number;
  };
  readonly "movement.modify": {
    readonly amount: number;
  };
  readonly "status.add": {
    readonly statusDefinitionId: string;
    readonly stacks: number;
  };
  readonly "status.remove": {
    readonly statusDefinitionId: string;
  };
  readonly "weather.change": {
    readonly weatherId: string;
  };
  readonly "item.obtain": {
    readonly itemDefinitionId: string;
    readonly quantity: number;
  };
  readonly "handCard.draw": {
    readonly amount: number;
  };
}

/** 描述业务对象不随运行过程改变的静态定义。 */
export type HandCardEffectDefinition = {
  readonly [EffectId in HandCardEffectId]: {
    readonly effectId: EffectId;
    readonly parameters: HandCardEffectParametersById[EffectId];
  };
}[HandCardEffectId];

/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardDestination = (typeof HAND_CARD_DESTINATIONS)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardId = ResourceId<"card">;

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface HandCardUsageDefinition {
  readonly timing: HandCardUsageTiming;
  readonly responseTypes: readonly HandCardResponseType[];
  readonly conditionIds: readonly HandCardConditionId[];
  readonly targetTypes: readonly HandCardTargetType[];
}

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface HandCardDefinition {
  readonly cardId: HandCardId;
  readonly name: string;
  readonly description: string;
  readonly quality: StandardQuality;
  readonly type: HandCardType;
  readonly usage: HandCardUsageDefinition;
  readonly effects: readonly HandCardEffectDefinition[];
  readonly destinationAfterResolution: HandCardDestination;
}

/** 描述以标识索引业务定义的只读注册表。 */
export type HandCardCatalog = Readonly<Record<string, HandCardDefinition>>;

/**
 * 方法名：validateHandCardDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateHandCardDefinition(definition: HandCardDefinition): void {
  assertResourceId(definition.cardId, "card");
  assertCamelCaseCardName(definition.name);
  assertEnglishDescription(definition.description);

  if (!isStandardQuality(definition.quality)) {
    throw new RangeError(`Unsupported hand card quality: ${definition.quality}`);
  }

  if (!HAND_CARD_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported hand card type: ${definition.type}`);
  }

  if (!HAND_CARD_USAGE_TIMINGS.includes(definition.usage.timing)) {
    throw new RangeError(`Unsupported hand card usage timing: ${definition.usage.timing}`);
  }

  if (!HAND_CARD_DESTINATIONS.includes(definition.destinationAfterResolution)) {
    throw new RangeError(
      `Unsupported hand card destination: ${definition.destinationAfterResolution}`,
    );
  }

  if (definition.usage.timing === "response" && definition.usage.responseTypes.length === 0) {
    throw new Error("Response hand cards must declare at least one response type");
  }

  if (definition.usage.timing === "active" && definition.usage.responseTypes.length > 0) {
    throw new Error("Active hand cards must not declare response types");
  }

  for (const responseType of definition.usage.responseTypes) {
    if (!HAND_CARD_RESPONSE_TYPES.includes(responseType)) {
      throw new RangeError(`Unsupported hand card response type: ${responseType}`);
    }
  }

  for (const conditionId of definition.usage.conditionIds) {
    if (!HAND_CARD_CONDITION_IDS.includes(conditionId)) {
      throw new RangeError(`Unsupported hand card condition id: ${conditionId}`);
    }
  }

  for (const targetType of definition.usage.targetTypes) {
    if (!HAND_CARD_TARGET_TYPES.includes(targetType)) {
      throw new RangeError(`Unsupported hand card target type: ${targetType}`);
    }
  }

  validateUniqueStrings(definition.usage.responseTypes, "usage.responseTypes");
  validateUniqueStrings(definition.usage.conditionIds, "usage.conditionIds");
  validateUniqueStrings(definition.usage.targetTypes, "usage.targetTypes");

  if (definition.effects.length === 0) {
    throw new Error("Hand cards must declare at least one effect");
  }

  for (const effect of definition.effects) {
    validateHandCardEffectDefinition(effect);
  }
}

/**
 * 方法名：validateHandCardEffectDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param effect 方法所需的 effect 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateHandCardEffectDefinition(effect: HandCardEffectDefinition): void {
  const candidate = effect as unknown as {
    readonly effectId: string;
    readonly parameters: unknown;
  };

  if (!(HAND_CARD_EFFECT_IDS as readonly string[]).includes(candidate.effectId)) {
    throw new RangeError(`Unsupported hand card effect id: ${candidate.effectId}`);
  }

  const parameters = assertParameterRecord(candidate.parameters, candidate.effectId);

  switch (candidate.effectId as HandCardEffectId) {
    case "attack.modifyHit":
    case "movement.modify":
      assertExactParameterKeys(parameters, ["amount"], candidate.effectId);
      assertNonZeroSafeInteger(parameters.amount, `${candidate.effectId}.parameters.amount`);
      return;
    case "damage.reduce":
    case "health.restore":
    case "handCard.draw":
      assertExactParameterKeys(parameters, ["amount"], candidate.effectId);
      assertPositiveSafeInteger(parameters.amount, `${candidate.effectId}.parameters.amount`);
      return;
    case "status.add":
      assertExactParameterKeys(parameters, ["statusDefinitionId", "stacks"], candidate.effectId);
      assertStatusResourceId(
        parameters.statusDefinitionId,
        `${candidate.effectId}.parameters.statusDefinitionId`,
      );
      assertPositiveSafeInteger(parameters.stacks, `${candidate.effectId}.parameters.stacks`);
      return;
    case "status.remove":
      assertExactParameterKeys(parameters, ["statusDefinitionId"], candidate.effectId);
      assertStatusResourceId(
        parameters.statusDefinitionId,
        `${candidate.effectId}.parameters.statusDefinitionId`,
      );
      return;
    case "weather.change":
      assertExactParameterKeys(parameters, ["weatherId"], candidate.effectId);
      assertResourceIdParameter(
        parameters.weatherId,
        "weather",
        `${candidate.effectId}.parameters.weatherId`,
      );
      return;
    case "item.obtain":
      assertExactParameterKeys(parameters, ["itemDefinitionId", "quantity"], candidate.effectId);
      assertItemResourceId(
        parameters.itemDefinitionId,
        `${candidate.effectId}.parameters.itemDefinitionId`,
      );
      assertPositiveSafeInteger(parameters.quantity, `${candidate.effectId}.parameters.quantity`);
  }
}

/**
 * 方法名：assertStatusResourceId
 * 作用：校验效果参数引用 Buff 或 Debuff 静态资源。
 * @param value 需要校验的参数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是合法状态资源 ID 时抛出错误。
 */
function assertStatusResourceId(value: unknown, field: string): void {
  assertNonEmptyStringParameter(value, field);
  assertResourceId(value);

  if (!value.startsWith("buff_") && !value.startsWith("debuff_")) {
    throw new RangeError(`${field} must reference a buff or debuff resource: ${value}`);
  }
}

/**
 * 方法名：assertItemResourceId
 * 作用：校验效果参数引用普通物品或装备静态资源。
 * @param value 需要校验的参数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是合法物品或装备资源 ID 时抛出错误。
 */
function assertItemResourceId(value: unknown, field: string): void {
  assertNonEmptyStringParameter(value, field);
  assertResourceId(value);

  if (!value.startsWith("item_") && !value.startsWith("equip_")) {
    throw new RangeError(`${field} must reference an item or equipment resource: ${value}`);
  }
}

/**
 * 方法名：assertResourceIdParameter
 * 作用：校验效果参数为指定类型的静态资源 ID。
 * @param value 需要校验的参数值。
 * @param prefix 期望使用的资源类型前缀。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 参数不是指定类型资源 ID 时抛出错误。
 */
function assertResourceIdParameter(value: unknown, prefix: "weather", field: string): void {
  assertNonEmptyStringParameter(value, field);
  assertResourceId(value, prefix);
}

/**
 * 方法名：validateHandCardDefinitions
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateHandCardDefinitions(definitions: readonly HandCardDefinition[]): void {
  const cardIds = new Set<HandCardId>();
  const definitionsByName = new Map<string, HandCardDefinition>();

  for (const definition of definitions) {
    validateHandCardDefinition(definition);

    if (cardIds.has(definition.cardId)) {
      throw new Error(`Duplicate hand card id: ${definition.cardId}`);
    }

    const existingDefinition = definitionsByName.get(definition.name);

    if (existingDefinition !== undefined && !hasSameCardContent(existingDefinition, definition)) {
      throw new Error(
        `Hand cards with the same name must have identical content: ${definition.name}`,
      );
    }

    cardIds.add(definition.cardId);
    definitionsByName.set(definition.name, definition);
  }
}

/**
 * 方法名：validateUniqueStrings
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param values 方法所需的 values 参数。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateUniqueStrings(values: readonly string[], field: string): void {
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
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/**
 * 方法名：assertCamelCaseCardName
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertCamelCaseCardName(value: string): void {
  assertNonEmptyString(value, "name");

  if (!/^[a-z][A-Za-z0-9]*$/.test(value)) {
    throw new TypeError("name must use camelCase with English letters and optional digits");
  }
}

/**
 * 方法名：assertEnglishDescription
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertEnglishDescription(value: string): void {
  assertNonEmptyString(value, "description");

  if (
    value !== value.trim() ||
    !/^[\x20-\x7E]+$/.test(value) ||
    !/^[A-Z]/.test(value) ||
    !/[.!?]$/.test(value)
  ) {
    throw new TypeError(
      "description must be a trimmed English sentence starting with a capital letter and ending with punctuation",
    );
  }
}

/**
 * 方法名：hasSameCardContent
 * 作用：判断输入是否满足当前业务条件。
 * @param left 方法所需的 left 参数。
 * @param right 方法所需的 right 参数。
 * @returns 本次处理得到的结果。
 */
function hasSameCardContent(left: HandCardDefinition, right: HandCardDefinition): boolean {
  return (
    left.name === right.name &&
    left.description === right.description &&
    left.quality === right.quality &&
    left.type === right.type &&
    left.usage.timing === right.usage.timing &&
    haveSameStrings(left.usage.responseTypes, right.usage.responseTypes) &&
    haveSameStrings(left.usage.conditionIds, right.usage.conditionIds) &&
    haveSameStrings(left.usage.targetTypes, right.usage.targetTypes) &&
    haveSameEffects(left.effects, right.effects) &&
    left.destinationAfterResolution === right.destinationAfterResolution
  );
}

/**
 * 方法名：haveSameEffects
 * 作用：执行该方法负责的单一业务操作。
 * @param left 方法所需的 left 参数。
 * @param right 方法所需的 right 参数。
 * @returns 本次处理得到的结果。
 */
function haveSameEffects(
  left: readonly HandCardEffectDefinition[],
  right: readonly HandCardEffectDefinition[],
): boolean {
  return (
    left.length === right.length &&
    left.every((effect, index) => {
      const otherEffect = right[index];

      return (
        otherEffect !== undefined &&
        effect.effectId === otherEffect.effectId &&
        haveSameParameters(effect.parameters, otherEffect.parameters)
      );
    })
  );
}

/**
 * 方法名：haveSameParameters
 * 作用：执行该方法负责的单一业务操作。
 * @param left 方法所需的 left 参数。
 * @param right 方法所需的 right 参数。
 * @returns 本次处理得到的结果。
 */
function haveSameParameters(left: object, right: object): boolean {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([key, value], index) =>
        key === rightEntries[index]?.[0] && Object.is(value, rightEntries[index]?.[1]),
    )
  );
}

/**
 * 方法名：haveSameStrings
 * 作用：执行该方法负责的单一业务操作。
 * @param left 方法所需的 left 参数。
 * @param right 方法所需的 right 参数。
 * @returns 本次处理得到的结果。
 */
function haveSameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

/**
 * 方法名：assertNonZeroSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonZeroSafeInteger(value: unknown, field: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value === 0) {
    throw new RangeError(`${field} must be a non-zero safe integer`);
  }
}

/**
 * 方法名：assertNonEmptyStringParameter
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyStringParameter(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/**
 * 方法名：assertParameterRecord
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param effectId 方法所需的 effectId 参数。
 * @returns 本次处理得到的结果。
 * @throws 输入或配置不满足模块约束时抛出错误。
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
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param parameters 方法所需的 parameters 参数。
 * @param expectedKeys 方法所需的 expectedKeys 参数。
 * @param effectId 方法所需的 effectId 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertExactParameterKeys(
  parameters: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  effectId: string,
): void {
  const actualKeys = Object.keys(parameters).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  if (!haveSameStrings(actualKeys, sortedExpectedKeys)) {
    throw new TypeError(
      `${effectId}.parameters must contain exactly: ${sortedExpectedKeys.join(", ")}`,
    );
  }
}
