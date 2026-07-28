import type {
  DerivedAttributeFormulaConfig,
  PrimaryAttributeOffset,
  PrimaryAttributes,
} from "@genesis-rift/shared";

import { calculateDerivedAttribute } from "./calculate-derived-attribute.ts";

export interface CalculateDerivedAttributesInput<DerivedAttribute extends string> {
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>;
  readonly primaryDynamicOffset?: PrimaryAttributeOffset;
  readonly derivedDynamicOffset?: Readonly<Partial<Record<DerivedAttribute, number>>>;
}

export function calculateDerivedAttributes<DerivedAttribute extends string>(
  input: CalculateDerivedAttributesInput<DerivedAttribute>,
): Readonly<Record<DerivedAttribute, number>> {
  const derivedAttributes = {} as Record<DerivedAttribute, number>;

  for (const attribute of Object.keys(input.configs) as DerivedAttribute[]) {
    derivedAttributes[attribute] = calculateDerivedAttribute({
      currentPrimaryAttributes: input.currentPrimaryAttributes,
      config: input.configs[attribute],
      primaryDynamicOffset: input.primaryDynamicOffset ?? {},
      derivedDynamicOffset: input.derivedDynamicOffset?.[attribute] ?? 0,
    });
  }

  return derivedAttributes;
}
