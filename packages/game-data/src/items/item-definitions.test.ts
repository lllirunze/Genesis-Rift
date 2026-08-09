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
  WIND_TONIC_ITEM_DEFINITION,
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
    expect(WIND_TONIC_ITEM_DEFINITION).toMatchObject({
      category: "consumable",
      quality: "excellent",
      maximumStack: 3,
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
      "item_000001",
      "item_000002",
      "item_000003",
      "item_000004",
      "item_000005",
      "item_000006",
      "item_000007",
      "item_000008",
      "item_000009",
      "item_000010",
      "item_000011",
      "item_000012",
      "item_000013",
      "item_000014",
      "equip_000001",
      "equip_000002",
      "equip_000003",
    ]);
  });
});
