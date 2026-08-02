import type { PrimaryAttribute, PrimaryAttributes } from "@genesis-rift/shared";

interface AttributeModifierBase {
  readonly modifierId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly value: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface PrimaryAttributeModifier extends AttributeModifierBase {
  readonly targetType: "primary";
  readonly targetAttribute: PrimaryAttribute;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface DerivedAttributeModifier extends AttributeModifierBase {
  readonly targetType: "derived";
  readonly targetAttribute: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type AttributeModifier = PrimaryAttributeModifier | DerivedAttributeModifier;

/** 描述当前模块对外公开的业务数据契约。 */
export interface AggregatedAttributeModifiers {
  readonly primaryDynamicOffset: PrimaryAttributes;
  readonly derivedDynamicOffset: Readonly<Record<string, number>>;
}
