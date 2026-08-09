import type { CharacterResourceState, CharacterResourceValue } from "../character/index.ts";

import {
  REINCARNATION_HEALTH_RECOVERY_NUMERATOR,
  REINCARNATION_OTHER_RESOURCE_RECOVERY_NUMERATOR,
  REINCARNATION_RECOVERY_DENOMINATOR,
} from "./revival-config.ts";

/**
 * 方法名：restoreCharacterResourcesAfterReincarnation
 * 作用：按轮回规则恢复生命资源与其他角色资源，不修改资源定义或最大值。
 * @param state 角色当前的运行时资源状态。
 * @param healthResourceId 当前角色生命资源在资源状态中的标识。
 * @returns 恢复后的不可变角色资源状态。
 * @throws 资源不存在、资源边界非法或生命资源标识为空时抛出错误。
 */
export function restoreCharacterResourcesAfterReincarnation<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  healthResourceId: ResourceId,
): CharacterResourceState<ResourceId> {
  assertNonEmptyString(healthResourceId, "healthResourceId");

  if (state.resources[healthResourceId] === undefined) {
    throw new Error(`Health resource is not present: ${healthResourceId}`);
  }

  const resources = {} as Record<ResourceId, CharacterResourceValue>;

  for (const resourceId of Object.keys(state.resources) as ResourceId[]) {
    const resource = state.resources[resourceId]!;
    validateResourceValue(resource, resourceId);
    const numerator =
      resourceId === healthResourceId
        ? REINCARNATION_HEALTH_RECOVERY_NUMERATOR
        : REINCARNATION_OTHER_RESOURCE_RECOVERY_NUMERATOR;

    if (resourceId === healthResourceId && resource.maximum < 1) {
      throw new RangeError("Health resource maximum must be at least 1 for reincarnation recovery");
    }

    const recovered = Math.floor(
      (resource.maximum * numerator) / REINCARNATION_RECOVERY_DENOMINATOR,
    );
    const minimum =
      resourceId === healthResourceId ? Math.max(1, resource.minimum) : resource.minimum;

    resources[resourceId] = Object.freeze({
      ...resource,
      current: Math.min(resource.maximum, Math.max(minimum, recovered)),
    });
  }

  return Object.freeze({ ...state, resources: Object.freeze(resources) });
}

/** 校验角色资源数值处于允许边界内。 */
function validateResourceValue(resource: CharacterResourceValue, resourceId: string): void {
  if (
    !Number.isSafeInteger(resource.minimum) ||
    !Number.isSafeInteger(resource.maximum) ||
    !Number.isSafeInteger(resource.current)
  ) {
    throw new TypeError(`Resource ${resourceId} must use safe integer values`);
  }

  if (resource.minimum < 0 || resource.maximum < resource.minimum) {
    throw new RangeError(`Resource ${resourceId} has invalid boundaries`);
  }

  if (resource.current < resource.minimum || resource.current > resource.maximum) {
    throw new RangeError(`Resource ${resourceId} current value must stay within its boundaries`);
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
