import type { PrimaryAttribute, PrimaryAttributes } from "@genesis-rift/shared";

interface AttributeModifierBase {
  readonly modifierId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly value: number;
}

export interface PrimaryAttributeModifier extends AttributeModifierBase {
  readonly targetType: "primary";
  readonly targetAttribute: PrimaryAttribute;
}

export interface DerivedAttributeModifier extends AttributeModifierBase {
  readonly targetType: "derived";
  readonly targetAttribute: string;
}

export type AttributeModifier = PrimaryAttributeModifier | DerivedAttributeModifier;

export interface AggregatedAttributeModifiers {
  readonly primaryDynamicOffset: PrimaryAttributes;
  readonly derivedDynamicOffset: Readonly<Record<string, number>>;
}
