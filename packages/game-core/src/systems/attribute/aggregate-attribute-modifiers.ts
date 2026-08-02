import { PRIMARY_ATTRIBUTE_KEYS, type PrimaryAttributes } from "@genesis-rift/shared";

import type { AggregatedAttributeModifiers, AttributeModifier } from "./attribute-modifier.ts";

/**
 * 方法名：aggregateAttributeModifiers
 * 作用：根据输入执行确定性计算并返回结果。
 * @param modifiers 方法所需的 modifiers 参数。
 * @returns 本次处理得到的结果。
 */
export function aggregateAttributeModifiers(
  modifiers: readonly AttributeModifier[],
): AggregatedAttributeModifiers {
  const primaryDynamicOffset = createZeroPrimaryAttributes();
  const derivedDynamicOffset: Record<string, number> = {};
  const modifierIds = new Set<string>();

  for (const modifier of modifiers) {
    if (modifierIds.has(modifier.modifierId)) {
      throw new Error(`Duplicate attribute modifier id: ${modifier.modifierId}`);
    }

    modifierIds.add(modifier.modifierId);
    assertFiniteNumber(modifier.value, `${modifier.modifierId}.value`);

    if (modifier.targetType === "primary") {
      primaryDynamicOffset[modifier.targetAttribute] += modifier.value;
      assertFiniteNumber(
        primaryDynamicOffset[modifier.targetAttribute],
        `primaryDynamicOffset.${modifier.targetAttribute}`,
      );
      continue;
    }

    const currentValue = derivedDynamicOffset[modifier.targetAttribute] ?? 0;
    const nextValue = currentValue + modifier.value;

    assertFiniteNumber(nextValue, `derivedDynamicOffset.${modifier.targetAttribute}`);
    derivedDynamicOffset[modifier.targetAttribute] = nextValue;
  }

  return {
    primaryDynamicOffset,
    derivedDynamicOffset,
  };
}

/**
 * 方法名：createZeroPrimaryAttributes
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createZeroPrimaryAttributes(): Record<keyof PrimaryAttributes, number> {
  const attributes = {} as Record<keyof PrimaryAttributes, number>;

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    attributes[attribute] = 0;
  }

  return attributes;
}

/**
 * 方法名：assertFiniteNumber
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
}
