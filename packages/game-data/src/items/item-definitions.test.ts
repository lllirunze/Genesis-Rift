import { describe, expect, it } from "vitest";

import { COIN_ITEM_DEFINITION_ID } from "@genesis-rift/shared";

import {
  ANTIDOTE_ITEM_DEFINITION,
  CLIMBING_ROPE_ITEM_DEFINITION,
  COIN_ITEM_DEFINITION,
  HEALING_POTION_ITEM_DEFINITION,
  HEAVY_PLATE_ARMOR_ITEM_DEFINITION,
  IRON_ORE_ITEM_DEFINITION,
  ITEM_DEFINITION_CATALOG,
  LINEN_CLOTH_ITEM_DEFINITION,
  LONG_SWORD_ITEM_DEFINITION,
  MAGIC_DUST_ITEM_DEFINITION,
  MANA_POTION_ITEM_DEFINITION,
  TORCH_ITEM_DEFINITION,
  TRAVEL_BOOTS_ITEM_DEFINITION,
  TREASURE_MAP_ITEM_DEFINITION,
} from "./item-definitions.ts";

describe("item definitions", () => {
  it("defines Coin as a normal configured backpack item", () => {
    expect(COIN_ITEM_DEFINITION).toEqual({
      definitionId: COIN_ITEM_DEFINITION_ID,
      name: "Coin",
      category: "currency",
      quality: "common",
      width: 1,
      height: 1,
      maximumStack: 5,
    });
    expect(ITEM_DEFINITION_CATALOG[COIN_ITEM_DEFINITION_ID]).toBe(COIN_ITEM_DEFINITION);
  });

  it("provides representative material definitions", () => {
    expect(LINEN_CLOTH_ITEM_DEFINITION).toMatchObject({
      category: "material",
      width: 1,
      height: 1,
      maximumStack: 5,
    });
    expect(IRON_ORE_ITEM_DEFINITION).toMatchObject({
      category: "material",
      maximumStack: 5,
    });
    expect(MAGIC_DUST_ITEM_DEFINITION).toMatchObject({
      category: "material",
      quality: "excellent",
      maximumStack: 10,
    });
  });

  it("provides representative consumable definitions", () => {
    expect(HEALING_POTION_ITEM_DEFINITION).toMatchObject({
      category: "consumable",
      width: 1,
      height: 2,
      maximumStack: 3,
    });
    expect(MANA_POTION_ITEM_DEFINITION).toMatchObject({
      category: "consumable",
      width: 1,
      height: 2,
      maximumStack: 3,
    });
    expect(ANTIDOTE_ITEM_DEFINITION).toMatchObject({
      category: "consumable",
      quality: "excellent",
      maximumStack: 5,
    });
  });

  it("provides representative special item definitions", () => {
    expect(CLIMBING_ROPE_ITEM_DEFINITION).toMatchObject({
      category: "special",
      width: 1,
      height: 3,
      maximumStack: 1,
    });
    expect(TORCH_ITEM_DEFINITION).toMatchObject({
      category: "special",
      width: 1,
      height: 2,
    });
    expect(TREASURE_MAP_ITEM_DEFINITION).toMatchObject({
      category: "special",
      quality: "rare",
      width: 2,
      height: 2,
    });
  });

  it("provides representative equipment definitions", () => {
    expect(HEAVY_PLATE_ARMOR_ITEM_DEFINITION).toMatchObject({
      category: "equipment",
      quality: "rare",
      width: 3,
      height: 4,
      maximumStack: 1,
    });
    expect(LONG_SWORD_ITEM_DEFINITION).toMatchObject({
      category: "equipment",
      quality: "excellent",
      width: 2,
      height: 4,
    });
    expect(TRAVEL_BOOTS_ITEM_DEFINITION).toMatchObject({
      category: "equipment",
      width: 2,
      height: 2,
    });
  });

  it("collects every configured item in the unified catalog", () => {
    expect(Object.keys(ITEM_DEFINITION_CATALOG)).toEqual([
      "item.coin",
      "item.material.linen-cloth",
      "item.material.iron-ore",
      "item.material.magic-dust",
      "item.consumable.healing-potion",
      "item.consumable.mana-potion",
      "item.consumable.antidote",
      "item.special.climbing-rope",
      "item.special.torch",
      "item.special.treasure-map",
      "item.equipment.heavy-plate-armor",
      "item.equipment.long-sword",
      "item.equipment.travel-boots",
    ]);
  });
});
