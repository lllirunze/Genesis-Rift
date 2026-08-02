import {
  CONSUMABLE_EFFECT_IDS,
  type CONSUMABLE_EFFECT_EXECUTION_OUTCOMES,
} from "./consumable-effect-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type ConsumableEffectId = (typeof CONSUMABLE_EFFECT_IDS)[number];
/** 描述当前模块对外公开的业务数据契约。 */
export type ConsumableEffectExecutionOutcome =
  (typeof CONSUMABLE_EFFECT_EXECUTION_OUTCOMES)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface ConsumableEffectParametersById {
  readonly "resource.restore": {
    readonly resourceId: string;
    readonly amount: number;
  };
  readonly "status.add": {
    readonly statusDefinitionId: string;
  };
  readonly "status.remove": {
    readonly statusDefinitionId: string;
  };
}

/** 描述业务对象不随运行过程改变的静态定义。 */
export type ConsumableEffectDefinition = {
  readonly [EffectId in ConsumableEffectId]: {
    readonly effectId: EffectId;
    readonly parameters: ConsumableEffectParametersById[EffectId];
  };
}[ConsumableEffectId];

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface ConsumableUsageDefinition {
  readonly itemDefinitionId: string;
  readonly effects: readonly ConsumableEffectDefinition[];
}

/** 描述以标识索引业务定义的只读注册表。 */
export type ConsumableUsageCatalog = Readonly<Record<string, ConsumableUsageDefinition>>;

/**
 * 方法名：validateConsumableUsageDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateConsumableUsageDefinition(definition: ConsumableUsageDefinition): void {
  assertNonEmptyString(definition.itemDefinitionId, "itemDefinitionId");

  if (definition.effects.length === 0) {
    throw new Error("Consumable items must declare at least one effect");
  }

  for (const effect of definition.effects) {
    validateConsumableEffectDefinition(effect);
  }
}

/**
 * 方法名：validateConsumableUsageCatalog
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param catalog 方法所需的 catalog 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateConsumableUsageCatalog(catalog: ConsumableUsageCatalog): void {
  for (const [itemDefinitionId, definition] of Object.entries(catalog)) {
    if (itemDefinitionId !== definition.itemDefinitionId) {
      throw new Error(
        `Consumable usage catalog key ${itemDefinitionId} does not match ${definition.itemDefinitionId}`,
      );
    }

    validateConsumableUsageDefinition(definition);
  }
}

/**
 * 方法名：validateConsumableEffectDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param effect 方法所需的 effect 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateConsumableEffectDefinition(effect: ConsumableEffectDefinition): void {
  const candidate = effect as {
    readonly effectId: string;
    readonly parameters: Readonly<Record<string, unknown>>;
  };

  if (!(CONSUMABLE_EFFECT_IDS as readonly string[]).includes(candidate.effectId)) {
    throw new RangeError(`Unsupported consumable effect id: ${candidate.effectId}`);
  }

  switch (effect.effectId) {
    case "resource.restore":
      assertExactKeys(effect.parameters, ["resourceId", "amount"], effect.effectId);
      assertNonEmptyString(effect.parameters.resourceId, "resource.restore.resourceId");
      assertPositiveSafeInteger(effect.parameters.amount, "resource.restore.amount");
      return;
    case "status.add":
    case "status.remove":
      assertExactKeys(effect.parameters, ["statusDefinitionId"], effect.effectId);
      assertNonEmptyString(
        effect.parameters.statusDefinitionId,
        `${effect.effectId}.statusDefinitionId`,
      );
  }
}

/**
 * 方法名：assertExactKeys
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param expectedKeys 方法所需的 expectedKeys 参数。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  field: string,
): void {
  const actualKeys = Object.keys(value).toSorted();
  const sortedExpectedKeys = [...expectedKeys].toSorted();

  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(`${field} parameters must contain exactly: ${expectedKeys.join(", ")}`);
  }
}

/**
 * 方法名：assertPositiveSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
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
