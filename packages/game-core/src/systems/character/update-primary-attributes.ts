import {
  PRIMARY_ATTRIBUTE_KEYS,
  type PrimaryAttributeOffset,
  type PrimaryAttributes,
} from "@genesis-rift/shared";

import type { CharacterState } from "./character-state.ts";

export function applyPermanentPrimaryAttributeChange(
  character: CharacterState,
  changes: PrimaryAttributeOffset,
): CharacterState {
  const currentPrimaryAttributes = {} as Record<keyof PrimaryAttributes, number>;

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    const change = changes[attribute] ?? 0;

    if (!Number.isInteger(change)) {
      throw new TypeError(`changes.${attribute} must be an integer`);
    }

    const currentValue = character.currentPrimaryAttributes[attribute] + change;

    if (currentValue < 0) {
      throw new RangeError(`currentPrimaryAttributes.${attribute} must not be negative`);
    }

    currentPrimaryAttributes[attribute] = currentValue;
  }

  return {
    ...character,
    currentPrimaryAttributes,
  };
}
