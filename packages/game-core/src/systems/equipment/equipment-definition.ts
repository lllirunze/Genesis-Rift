import {
  isStandardQuality,
  type PrimaryAttribute,
  type StandardQuality,
} from "@genesis-rift/shared";

export const EQUIPMENT_TYPES = ["weapon", "armor", "shoes", "accessory", "special"] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

interface EquipmentAttributeEffectBase {
  readonly effectId: string;
  readonly value: number;
}

export interface EquipmentPrimaryAttributeEffect extends EquipmentAttributeEffectBase {
  readonly targetType: "primary";
  readonly targetAttribute: PrimaryAttribute;
}

export interface EquipmentDerivedAttributeEffect extends EquipmentAttributeEffectBase {
  readonly targetType: "derived";
  readonly targetAttribute: string;
}

export type EquipmentAttributeEffect =
  EquipmentPrimaryAttributeEffect | EquipmentDerivedAttributeEffect;

export interface EquipmentDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly type: EquipmentType;
  readonly quality: StandardQuality;
  readonly corePosition: string;
  readonly allowDuplicateEquipping: boolean;
  readonly attributeEffects: readonly EquipmentAttributeEffect[];
}

export function validateEquipmentDefinition(definition: EquipmentDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.corePosition, "corePosition");

  if (!EQUIPMENT_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported equipment type: ${definition.type}`);
  }

  if (!isStandardQuality(definition.quality)) {
    throw new RangeError(`Unsupported equipment quality: ${definition.quality}`);
  }

  const effectIds = new Set<string>();

  for (const effect of definition.attributeEffects) {
    assertNonEmptyString(effect.effectId, "attributeEffects.effectId");

    if (effectIds.has(effect.effectId)) {
      throw new Error(`Duplicate equipment effect id: ${effect.effectId}`);
    }

    effectIds.add(effect.effectId);

    if (!Number.isInteger(effect.value)) {
      throw new TypeError(`Equipment effect ${effect.effectId} value must be an integer`);
    }

    if (effect.targetType === "derived") {
      assertNonEmptyString(effect.targetAttribute, `${effect.effectId}.targetAttribute`);
    }
  }
}

export function validateEquipmentDefinitions(definitions: readonly EquipmentDefinition[]): void {
  const definitionIds = new Set<string>();
  const names = new Set<string>();

  for (const definition of definitions) {
    validateEquipmentDefinition(definition);

    if (definitionIds.has(definition.definitionId)) {
      throw new Error(`Duplicate equipment definition id: ${definition.definitionId}`);
    }

    if (names.has(definition.name)) {
      throw new Error(`Duplicate equipment name: ${definition.name}`);
    }

    definitionIds.add(definition.definitionId);
    names.add(definition.name);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
