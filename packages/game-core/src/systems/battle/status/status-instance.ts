import { validateStatusDefinition, type StatusDefinition } from "./status-definition.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface StatusInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly currentStacks: number;
  readonly remainingTurns: number;
  readonly createdAtSequence: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateStatusInstanceInput {
  readonly instanceId: string;
  readonly definition: StatusDefinition;
  readonly sourceId: string;
  readonly targetId: string;
  readonly createdAtSequence: number;
}

/**
 * 方法名：createStatusInstance
 * 作用：创建并校验该方法所负责的业务对象。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function createStatusInstance(input: CreateStatusInstanceInput): StatusInstance {
  validateStatusDefinition(input.definition);
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.sourceId, "sourceId");
  assertNonEmptyString(input.targetId, "targetId");
  assertNonNegativeSafeInteger(input.createdAtSequence, "createdAtSequence");

  return {
    instanceId: input.instanceId,
    definitionId: input.definition.definitionId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    currentStacks: 0,
    remainingTurns: input.definition.duration.turns,
    createdAtSequence: input.createdAtSequence,
  };
}

/**
 * 方法名：validateStatusInstance
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param instance 方法所需的 instance 参数。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateStatusInstance(
  instance: StatusInstance,
  definition: StatusDefinition,
): void {
  validateStatusDefinition(definition);
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.definitionId, "definitionId");
  assertNonEmptyString(instance.sourceId, "sourceId");
  assertNonEmptyString(instance.targetId, "targetId");
  assertNonNegativeSafeInteger(instance.currentStacks, "currentStacks");
  assertNonNegativeSafeInteger(instance.remainingTurns, "remainingTurns");
  assertNonNegativeSafeInteger(instance.createdAtSequence, "createdAtSequence");

  if (instance.definitionId !== definition.definitionId) {
    throw new Error(
      `Status instance definition mismatch: expected ${definition.definitionId}, received ${instance.definitionId}`,
    );
  }

  if (instance.currentStacks > definition.maxStacks) {
    throw new RangeError(
      `currentStacks must not exceed the configured maximum of ${definition.maxStacks}`,
    );
  }

  if (instance.remainingTurns > definition.duration.turns) {
    throw new RangeError(
      `remainingTurns must not exceed the configured duration of ${definition.duration.turns}`,
    );
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
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
