import { isQuality, type Quality } from "@genesis-rift/shared";

import { BACKPACK_GRID_HEIGHT, BACKPACK_GRID_WIDTH } from "./backpack-config.ts";

export const ITEM_CATEGORIES = [
  "currency",
  "material",
  "consumable",
  "equipment",
  "blueprint",
  "quest",
  "special",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface ItemDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly quality: Quality;
  readonly width: number;
  readonly height: number;
  readonly maximumStack: number;
}

export type ItemDefinitionCatalog = Readonly<Record<string, ItemDefinition>>;

export function validateItemDefinition(definition: ItemDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");

  if (!ITEM_CATEGORIES.some((category) => category === definition.category)) {
    throw new RangeError(`Unsupported item category: ${definition.category as string}`);
  }

  if (!isQuality(definition.quality)) {
    throw new RangeError(`Unsupported item quality: ${definition.quality as string}`);
  }

  assertPositiveSafeInteger(definition.width, "width");
  assertPositiveSafeInteger(definition.height, "height");
  assertPositiveSafeInteger(definition.maximumStack, "maximumStack");

  if (definition.width > BACKPACK_GRID_WIDTH || definition.height > BACKPACK_GRID_HEIGHT) {
    throw new RangeError(
      `item dimensions must fit within the maximum ${BACKPACK_GRID_WIDTH} x ${BACKPACK_GRID_HEIGHT} backpack grid`,
    );
  }
}

export function validateItemDefinitionCatalog(catalog: ItemDefinitionCatalog): void {
  for (const [definitionId, definition] of Object.entries(catalog)) {
    if (definitionId !== definition.definitionId) {
      throw new Error(
        `Item definition catalog key ${definitionId} does not match ${definition.definitionId}`,
      );
    }

    validateItemDefinition(definition);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}
