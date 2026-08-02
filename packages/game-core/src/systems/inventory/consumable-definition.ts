import {
  CONSUMABLE_EFFECT_IDS,
  type CONSUMABLE_EFFECT_EXECUTION_OUTCOMES,
} from "./consumable-effect-config.ts";

export type ConsumableEffectId = (typeof CONSUMABLE_EFFECT_IDS)[number];
export type ConsumableEffectExecutionOutcome =
  (typeof CONSUMABLE_EFFECT_EXECUTION_OUTCOMES)[number];

export interface ConsumableEffectParametersById {
  readonly "resource.restore": {
    readonly resourceId: string;
    readonly amount: number;
  };
  readonly "status.add": {
    readonly statusDefinitionId: string;
  };
  readonly "status.remove": {
    readonly statusDefinitionId: string;
  };
}

export type ConsumableEffectDefinition = {
  readonly [EffectId in ConsumableEffectId]: {
    readonly effectId: EffectId;
    readonly parameters: ConsumableEffectParametersById[EffectId];
  };
}[ConsumableEffectId];

export interface ConsumableUsageDefinition {
  readonly itemDefinitionId: string;
  readonly effects: readonly ConsumableEffectDefinition[];
}

export type ConsumableUsageCatalog = Readonly<Record<string, ConsumableUsageDefinition>>;

export function validateConsumableUsageDefinition(definition: ConsumableUsageDefinition): void {
  assertNonEmptyString(definition.itemDefinitionId, "itemDefinitionId");

  if (definition.effects.length === 0) {
    throw new Error("Consumable items must declare at least one effect");
  }

  for (const effect of definition.effects) {
    validateConsumableEffectDefinition(effect);
  }
}

export function validateConsumableUsageCatalog(catalog: ConsumableUsageCatalog): void {
  for (const [itemDefinitionId, definition] of Object.entries(catalog)) {
    if (itemDefinitionId !== definition.itemDefinitionId) {
      throw new Error(
        `Consumable usage catalog key ${itemDefinitionId} does not match ${definition.itemDefinitionId}`,
      );
    }

    validateConsumableUsageDefinition(definition);
  }
}

export function validateConsumableEffectDefinition(effect: ConsumableEffectDefinition): void {
  const candidate = effect as {
    readonly effectId: string;
    readonly parameters: Readonly<Record<string, unknown>>;
  };

  if (!(CONSUMABLE_EFFECT_IDS as readonly string[]).includes(candidate.effectId)) {
    throw new RangeError(`Unsupported consumable effect id: ${candidate.effectId}`);
  }

  switch (effect.effectId) {
    case "resource.restore":
      assertExactKeys(effect.parameters, ["resourceId", "amount"], effect.effectId);
      assertNonEmptyString(effect.parameters.resourceId, "resource.restore.resourceId");
      assertPositiveSafeInteger(effect.parameters.amount, "resource.restore.amount");
      return;
    case "status.add":
    case "status.remove":
      assertExactKeys(effect.parameters, ["statusDefinitionId"], effect.effectId);
      assertNonEmptyString(
        effect.parameters.statusDefinitionId,
        `${effect.effectId}.statusDefinitionId`,
      );
  }
}

function assertExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  field: string,
): void {
  const actualKeys = Object.keys(value).toSorted();
  const sortedExpectedKeys = [...expectedKeys].toSorted();

  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(`${field} parameters must contain exactly: ${expectedKeys.join(", ")}`);
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
