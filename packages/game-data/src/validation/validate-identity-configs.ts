import {
  getPrimaryAttributeTotal,
  PRIMARY_ATTRIBUTE_KEYS,
} from "../attributes/primary-attributes.ts";
import { INITIAL_PRIMARY_ATTRIBUTE_TOTAL } from "../attributes/primary-attribute-config.ts";
import type { IdentityConfig } from "../identities/identity-config.ts";

export function validateIdentityConfig(config: IdentityConfig): void {
  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    const value = config.initialPrimaryAttributes[attribute];

    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${config.id}.${attribute} must be a non-negative integer`);
    }
  }

  const total = getPrimaryAttributeTotal(config.initialPrimaryAttributes);

  if (total !== INITIAL_PRIMARY_ATTRIBUTE_TOTAL) {
    throw new Error(
      `${config.id} initial primary attribute total must be ${INITIAL_PRIMARY_ATTRIBUTE_TOTAL}, received ${total}`,
    );
  }

  validateAttributePriorities(config);
}

function validateAttributePriorities(config: IdentityConfig): void {
  const { primary, secondary } = config.attributePriorities;

  if (primary.length === 0) {
    throw new Error(`${config.id} must define at least one primary attribute`);
  }

  const prioritizedAttributes = [...primary, ...secondary];

  if (new Set(prioritizedAttributes).size !== prioritizedAttributes.length) {
    throw new Error(`${config.id} attribute priorities must not contain duplicates`);
  }

  const primaryValues = primary.map((attribute) => config.initialPrimaryAttributes[attribute]);
  const secondaryValues = secondary.map((attribute) => config.initialPrimaryAttributes[attribute]);

  if (new Set(primaryValues).size !== 1) {
    throw new Error(`${config.id} equally ranked primary attributes must have equal values`);
  }

  if (secondaryValues.length > 0 && new Set(secondaryValues).size !== 1) {
    throw new Error(`${config.id} equally ranked secondary attributes must have equal values`);
  }

  const otherValues = PRIMARY_ATTRIBUTE_KEYS.filter(
    (attribute) => !prioritizedAttributes.includes(attribute),
  ).map((attribute) => config.initialPrimaryAttributes[attribute]);
  const primaryValue = primaryValues[0];

  if (primaryValue === undefined) {
    throw new Error(`${config.id} primary attribute value is missing`);
  }

  if (secondaryValues.length > 0) {
    const secondaryValue = secondaryValues[0];

    if (secondaryValue === undefined || primaryValue <= secondaryValue) {
      throw new Error(`${config.id} primary attributes must exceed secondary attributes`);
    }

    if (otherValues.some((value) => secondaryValue <= value)) {
      throw new Error(`${config.id} secondary attributes must exceed unranked attributes`);
    }

    return;
  }

  if (otherValues.some((value) => primaryValue <= value)) {
    throw new Error(`${config.id} primary attributes must exceed unranked attributes`);
  }
}

export function validateIdentityConfigs(configs: readonly IdentityConfig[]): void {
  const ids = new Set<string>();

  for (const config of configs) {
    if (ids.has(config.id)) {
      throw new Error(`Duplicate identity config id: ${config.id}`);
    }

    ids.add(config.id);
    validateIdentityConfig(config);
  }
}
