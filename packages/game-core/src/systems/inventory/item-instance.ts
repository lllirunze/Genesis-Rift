import type { PlayerId } from "@genesis-rift/shared";

import type { ItemDefinition } from "./item-definition.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface ItemInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity: number;
  readonly stackCompatibilityKey: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateItemInstanceInput {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly ownerPlayerId: PlayerId;
  readonly quantity?: number;
  readonly stackCompatibilityKey?: string;
}

/**
 * 方法名：createItemInstance
 * 作用：创建并校验该方法所负责的业务对象。
 * @param input 本次处理的输入数据。
 * @param definition 方法所需的 definition 参数。
 * @returns 本次处理得到的结果。
 */
export function createItemInstance(
  input: CreateItemInstanceInput,
  definition: ItemDefinition,
): ItemInstance {
  assertNonEmptyString(input.instanceId, "instanceId");
  assertNonEmptyString(input.definitionId, "definitionId");

  if (input.definitionId !== definition.definitionId) {
    throw new Error(`Item ${input.instanceId} does not match its definition`);
  }

  const quantity = input.quantity ?? 1;
  const stackCompatibilityKey = input.stackCompatibilityKey ?? "default";

  assertNonEmptyString(stackCompatibilityKey, "stackCompatibilityKey");
  validateItemQuantity(quantity, definition);

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    ownerPlayerId: input.ownerPlayerId,
    quantity,
    stackCompatibilityKey,
  };
}

/**
 * 方法名：validateItemInstance
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param instance 方法所需的 instance 参数。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateItemInstance(instance: ItemInstance, definition: ItemDefinition): void {
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.definitionId, "definitionId");
  assertNonEmptyString(instance.stackCompatibilityKey, "stackCompatibilityKey");

  if (instance.definitionId !== definition.definitionId) {
    throw new Error(`Item ${instance.instanceId} does not match its definition`);
  }

  validateItemQuantity(instance.quantity, definition);
}

/**
 * 方法名：areItemStacksCompatible
 * 作用：执行该方法负责的单一业务操作。
 * @param first 方法所需的 first 参数。
 * @param second 方法所需的 second 参数。
 * @returns 本次处理得到的结果。
 */
export function areItemStacksCompatible(first: ItemInstance, second: ItemInstance): boolean {
  return (
    first.definitionId === second.definitionId &&
    first.ownerPlayerId === second.ownerPlayerId &&
    first.stackCompatibilityKey === second.stackCompatibilityKey
  );
}

/**
 * 方法名：validateItemQuantity
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param quantity 方法所需的 quantity 参数。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateItemQuantity(quantity: number, definition: ItemDefinition): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError("quantity must be a positive safe integer");
  }

  if (quantity > definition.maximumStack) {
    throw new RangeError(
      `quantity must not exceed maximumStack ${definition.maximumStack}, received ${quantity}`,
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
