import type { Quality } from "./quality.ts";

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

export const COIN_ITEM_DEFINITION_ID = "item.coin";
