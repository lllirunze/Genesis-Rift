import { PRIMARY_ATTRIBUTE_KEYS, type DerivedAttributeFormulaConfig } from "@genesis-rift/shared";
import type { PrimaryAttributes } from "@genesis-rift/shared";

import type { CharacterState } from "../character/character-state.ts";
import { aggregateAttributeModifiers } from "./aggregate-attribute-modifiers.ts";
import type { AttributeModifier } from "./attribute-modifier.ts";
import { calculateDerivedAttributes } from "./calculate-derived-attributes.ts";

export interface CharacterAttributeSnapshot<DerivedAttribute extends string> {
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly primaryDynamicOffset: PrimaryAttributes;
  readonly effectivePrimaryAttributes: PrimaryAttributes;
  readonly derivedDynamicOffset: Readonly<Partial<Record<DerivedAttribute, number>>>;
  readonly derivedAttributes: Readonly<Record<DerivedAttribute, number>>;
}

export function createCharacterAttributeSnapshot<DerivedAttribute extends string>(
  character: CharacterState,
  configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>,
  additionalModifiers: readonly AttributeModifier[] = [],
): CharacterAttributeSnapshot<DerivedAttribute> {
  const aggregatedModifiers = aggregateAttributeModifiers([
    ...character.attributeModifiers,
    ...additionalModifiers,
  ]);
  const derivedDynamicOffset = validateDerivedOffsets(
    aggregatedModifiers.derivedDynamicOffset,
    configs,
  );
  const effectivePrimaryAttributes = {} as Record<keyof PrimaryAttributes, number>;

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    effectivePrimaryAttributes[attribute] =
      character.currentPrimaryAttributes[attribute] +
      aggregatedModifiers.primaryDynamicOffset[attribute];
  }

  return {
    currentPrimaryAttributes: character.currentPrimaryAttributes,
    primaryDynamicOffset: aggregatedModifiers.primaryDynamicOffset,
    effectivePrimaryAttributes,
    derivedDynamicOffset,
    derivedAttributes: calculateDerivedAttributes({
      currentPrimaryAttributes: character.currentPrimaryAttributes,
      configs,
      primaryDynamicOffset: aggregatedModifiers.primaryDynamicOffset,
      derivedDynamicOffset,
    }),
  };
}

function validateDerivedOffsets<DerivedAttribute extends string>(
  offsets: Readonly<Record<string, number>>,
  configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>,
): Readonly<Partial<Record<DerivedAttribute, number>>> {
  const validatedOffsets: Partial<Record<DerivedAttribute, number>> = {};

  for (const [attribute, value] of Object.entries(offsets)) {
    if (!(attribute in configs)) {
      throw new Error(`Missing derived attribute config: ${attribute}`);
    }

    validatedOffsets[attribute as DerivedAttribute] = value;
  }

  return validatedOffsets;
}
