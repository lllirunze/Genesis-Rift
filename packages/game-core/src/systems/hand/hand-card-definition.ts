import { isStandardQuality, type StandardQuality } from "@genesis-rift/shared";

export const HAND_CARD_TYPES = ["combat", "action", "event", "trick", "survival"] as const;

export type HandCardType = (typeof HAND_CARD_TYPES)[number];

export const HAND_CARD_USAGE_TIMINGS = ["response", "active", "special"] as const;

export type HandCardUsageTiming = (typeof HAND_CARD_USAGE_TIMINGS)[number];

export const HAND_CARD_DESTINATIONS = ["discard", "hand"] as const;

export type HandCardDestination = (typeof HAND_CARD_DESTINATIONS)[number];

export interface HandCardUsageDefinition {
  readonly timing: HandCardUsageTiming;
  readonly responseTypes: readonly string[];
  readonly conditionIds: readonly string[];
  readonly targetTypes: readonly string[];
}

export interface HandCardDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly description: string;
  readonly quality: StandardQuality;
  readonly type: HandCardType;
  readonly usage: HandCardUsageDefinition;
  readonly effectIds: readonly string[];
  readonly keywords: readonly string[];
  readonly destinationAfterResolution: HandCardDestination;
}

export type HandCardDefinitionCatalog = Readonly<Record<string, HandCardDefinition>>;

export function validateHandCardDefinition(definition: HandCardDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!isStandardQuality(definition.quality)) {
    throw new RangeError(`Unsupported hand card quality: ${definition.quality}`);
  }

  if (!HAND_CARD_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported hand card type: ${definition.type}`);
  }

  if (!HAND_CARD_USAGE_TIMINGS.includes(definition.usage.timing)) {
    throw new RangeError(`Unsupported hand card usage timing: ${definition.usage.timing}`);
  }

  if (!HAND_CARD_DESTINATIONS.includes(definition.destinationAfterResolution)) {
    throw new RangeError(
      `Unsupported hand card destination: ${definition.destinationAfterResolution}`,
    );
  }

  if (definition.usage.timing === "response" && definition.usage.responseTypes.length === 0) {
    throw new Error("Response hand cards must declare at least one response type");
  }

  validateUniqueStrings(definition.usage.responseTypes, "usage.responseTypes");
  validateUniqueStrings(definition.usage.conditionIds, "usage.conditionIds");
  validateUniqueStrings(definition.usage.targetTypes, "usage.targetTypes");
  validateUniqueStrings(definition.effectIds, "effectIds");
  validateUniqueStrings(definition.keywords, "keywords");

  if (definition.effectIds.length === 0) {
    throw new Error("Hand cards must declare at least one effect id");
  }
}

export function validateHandCardDefinitions(definitions: readonly HandCardDefinition[]): void {
  const definitionIds = new Set<string>();
  const names = new Set<string>();

  for (const definition of definitions) {
    validateHandCardDefinition(definition);

    if (definitionIds.has(definition.definitionId)) {
      throw new Error(`Duplicate hand card definition id: ${definition.definitionId}`);
    }

    if (names.has(definition.name)) {
      throw new Error(`Duplicate hand card name: ${definition.name}`);
    }

    definitionIds.add(definition.definitionId);
    names.add(definition.name);
  }
}

function validateUniqueStrings(values: readonly string[], field: string): void {
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
