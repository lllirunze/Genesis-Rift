import type { Quality } from "./quality.ts";
import { ITEM_CATEGORIES } from "../config/item-config.ts";

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
