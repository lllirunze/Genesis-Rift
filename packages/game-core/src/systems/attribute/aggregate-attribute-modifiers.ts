import { PRIMARY_ATTRIBUTE_KEYS, type PrimaryAttributes } from "@genesis-rift/shared";

import type { AggregatedAttributeModifiers, AttributeModifier } from "./attribute-modifier.ts";

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

function createZeroPrimaryAttributes(): Record<keyof PrimaryAttributes, number> {
  const attributes = {} as Record<keyof PrimaryAttributes, number>;

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    attributes[attribute] = 0;
  }

  return attributes;
}

function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
}
