import type { CharacterResourceState, CharacterResourceValue } from "./character-resource-state.ts";
import { getCharacterResource } from "./character-resource-state.ts";

/** 描述业务操作完成后返回的结果。 */
export interface CharacterResourceChangeResult<ResourceId extends string> {
  readonly state: CharacterResourceState<ResourceId>;
  readonly resource: CharacterResourceValue;
  readonly requestedAmount: number;
  readonly appliedAmount: number;
}

/**
 * 方法名：increaseCharacterResource
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function increaseCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  amount: number,
): CharacterResourceChangeResult<ResourceId> {
  assertNonNegativeSafeInteger(amount, "amount");
  const previous = getCharacterResource(state, resourceId);
  const appliedAmount = Math.min(amount, previous.maximum - previous.current);

  return updateCharacterResource(state, resourceId, previous.current + appliedAmount, {
    requestedAmount: amount,
    appliedAmount,
  });
}

/**
 * 方法名：decreaseCharacterResource
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function decreaseCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  amount: number,
): CharacterResourceChangeResult<ResourceId> {
  assertNonNegativeSafeInteger(amount, "amount");
  const previous = getCharacterResource(state, resourceId);
  const appliedAmount = Math.min(amount, previous.current - previous.minimum);

  return updateCharacterResource(state, resourceId, previous.current - appliedAmount, {
    requestedAmount: amount,
    appliedAmount,
  });
}

/**
 * 方法名：spendCharacterResource
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @param amount 本次操作涉及的数量。
 * @returns 本次处理得到的结果。
 */
export function spendCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  amount: number,
): CharacterResourceChangeResult<ResourceId> {
  assertNonNegativeSafeInteger(amount, "amount");
  const previous = getCharacterResource(state, resourceId);
  const available = previous.current - previous.minimum;

  if (amount > available) {
    throw new RangeError(
      `Insufficient character resource ${resourceId}: required ${amount}, available ${available}`,
    );
  }

  return updateCharacterResource(state, resourceId, previous.current - amount, {
    requestedAmount: amount,
    appliedAmount: amount,
  });
}

/**
 * 方法名：setCharacterResourceCurrentValue
 * 作用：更新目标数据，并返回满足约束的新状态。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @param value 待处理的值。
 * @returns 本次处理得到的结果。
 */
export function setCharacterResourceCurrentValue<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  value: number,
): CharacterResourceChangeResult<ResourceId> {
  assertSafeInteger(value, "value");
  const previous = getCharacterResource(state, resourceId);
  const current = Math.min(Math.max(value, previous.minimum), previous.maximum);

  return updateCharacterResource(state, resourceId, current, {
    requestedAmount: Math.abs(current - previous.current),
    appliedAmount: Math.abs(current - previous.current),
  });
}

/**
 * 方法名：isCharacterResourceDepleted
 * 作用：判断输入是否满足当前业务条件。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @returns 本次处理得到的结果。
 */
export function isCharacterResourceDepleted<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
): boolean {
  const resource = getCharacterResource(state, resourceId);
  return resource.current === resource.minimum;
}

/**
 * 方法名：updateCharacterResource
 * 作用：更新目标数据，并返回满足约束的新状态。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @param current 方法所需的 current 参数。
 * @param change 方法所需的 change 参数。
 * @returns 本次处理得到的结果。
 */
function updateCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  current: number,
  change: Pick<CharacterResourceChangeResult<ResourceId>, "requestedAmount" | "appliedAmount">,
): CharacterResourceChangeResult<ResourceId> {
  const previous = getCharacterResource(state, resourceId);
  const resource = { ...previous, current };

  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        [resourceId]: resource,
      },
    },
    resource,
    ...change,
  };
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
  assertSafeInteger(value, field);

  if (value < 0) {
    throw new RangeError(`${field} must not be negative`);
  }
}

/**
 * 方法名：assertSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
}
