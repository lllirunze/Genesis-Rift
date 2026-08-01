import type { PrimaryAttribute } from "@genesis-rift/shared";

export const PERMANENT_STATUS_DURATION_TURNS = 999_999;

export const STATUS_KINDS = ["buff", "debuff"] as const;

export type StatusKind = (typeof STATUS_KINDS)[number];

export interface StatusDuration {
  readonly turns: number;
}

export interface StatusRemovalPolicy {
  readonly dispellable: boolean;
  readonly removeOnDeath: boolean;
}

interface StatusAttributeEffectBase {
  readonly effectType: "attribute_modifier";
  readonly effectId: string;
  readonly valuePerStack: number;
}

export interface StatusPrimaryAttributeEffect extends StatusAttributeEffectBase {
  readonly targetType: "primary";
  readonly targetAttribute: PrimaryAttribute;
}

export interface StatusDerivedAttributeEffect extends StatusAttributeEffectBase {
  readonly targetType: "derived";
  readonly targetAttribute: string;
}

export type StatusEffect = StatusPrimaryAttributeEffect | StatusDerivedAttributeEffect;

export interface StatusDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly description: string;
  readonly kind: StatusKind;
  readonly tags: readonly string[];
  readonly duration: StatusDuration;
  readonly maxStacks: number;
  readonly removal: StatusRemovalPolicy;
  readonly effects: readonly StatusEffect[];
}

export type StatusDefinitionCatalog = Readonly<Record<string, StatusDefinition>>;

export function validateStatusDefinition(definition: StatusDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!STATUS_KINDS.includes(definition.kind)) {
    throw new RangeError(`Unsupported status kind: ${definition.kind}`);
  }

  validateUniqueNonEmptyStrings(definition.tags, "tags");
  validateDuration(definition.duration);
  assertPositiveSafeInteger(definition.maxStacks, "maxStacks");
  validateEffects(definition.effects);
}

export function validateStatusDefinitions(definitions: readonly StatusDefinition[]): void {
  const definitionIds = new Set<string>();
  const names = new Set<string>();

  for (const definition of definitions) {
    validateStatusDefinition(definition);

    if (definitionIds.has(definition.definitionId)) {
      throw new Error(`Duplicate status definition id: ${definition.definitionId}`);
    }

    if (names.has(definition.name)) {
      throw new Error(`Duplicate status name: ${definition.name}`);
    }

    definitionIds.add(definition.definitionId);
    names.add(definition.name);
  }
}

function validateDuration(duration: StatusDuration): void {
  assertPositiveSafeInteger(duration.turns, "duration.turns");
}

function validateEffects(effects: readonly StatusEffect[]): void {
  const effectIds = new Set<string>();

  for (const effect of effects) {
    assertNonEmptyString(effect.effectId, "effects.effectId");

    if (effectIds.has(effect.effectId)) {
      throw new Error(`Duplicate status effect id: ${effect.effectId}`);
    }

    effectIds.add(effect.effectId);

    if (effect.effectType !== "attribute_modifier") {
      throw new RangeError(`Unsupported status effect type: ${effect.effectType}`);
    }

    if (!Number.isSafeInteger(effect.valuePerStack)) {
      throw new TypeError(`Status effect ${effect.effectId} valuePerStack must be a safe integer`);
    }

    if (effect.targetType === "derived") {
      assertNonEmptyString(effect.targetAttribute, `${effect.effectId}.targetAttribute`);
    }
  }
}

function validateUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    uniqueValues.add(value);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
