import { describe, expect, it } from "vitest";
import type { TileId } from "@genesis-rift/shared";

import type { HexTile } from "../model/hex-tile.ts";
import type { TerrainDefinitionCatalog } from "../model/terrain-definition.ts";
import { calculateNormalMovementCost } from "./movement-cost-policy.ts";

/** 移动成本测试使用的普通与困难地形配置。 */
const TERRAIN_DEFINITIONS = {
  terrain_000001: {
    definitionId: "terrain_000001",
    name: "Plain",
    tags: ["land"],
    movementCostModifier: 0,
  },
  terrain_000002: {
    definitionId: "terrain_000002",
    name: "Forest",
    tags: ["land", "vegetation"],
    movementCostModifier: 1,
  },
  terrain_000003: {
    definitionId: "terrain_000003",
    name: "Mountain",
    tags: ["land", "highland"],
    movementCostModifier: 2,
  },
} as const satisfies TerrainDefinitionCatalog;

describe("normal movement cost policy", () => {
  it.each([
    { difference: 1, uphillCost: 1, totalCost: 2 },
    { difference: 2, uphillCost: 4, totalCost: 5 },
    { difference: 3, uphillCost: 9, totalCost: 10 },
  ])("uses the square of an uphill elevation difference", (example) => {
    const result = calculateNormalMovementCost(
      createTile("origin", 0, "terrain_000001"),
      createTile("target", example.difference, "terrain_000001"),
      TERRAIN_DEFINITIONS,
    );

    expect(result).toEqual({
      elevationDifference: example.difference,
      baseCost: 1,
      terrainCost: 0,
      uphillCost: example.uphillCost,
      totalCost: example.totalCost,
    });
  });

  it("does not add an elevation cost when moving downhill", () => {
    expect(
      calculateNormalMovementCost(
        createTile("origin", 3, "terrain_000001"),
        createTile("target", 0, "terrain_000001"),
        TERRAIN_DEFINITIONS,
      ),
    ).toEqual({
      elevationDifference: -3,
      baseCost: 1,
      terrainCost: 0,
      uphillCost: 0,
      totalCost: 1,
    });
  });

  it("only adds the target terrain cost", () => {
    const result = calculateNormalMovementCost(
      createTile("origin", 0, "terrain_000003"),
      createTile("target", 0, "terrain_000002"),
      TERRAIN_DEFINITIONS,
    );

    expect(result).toMatchObject({
      baseCost: 1,
      terrainCost: 1,
      uphillCost: 0,
      totalCost: 2,
    });
  });

  it.each([-1, 3])("rejects a target terrain cost outside the configured range", (terrainCost) => {
    const invalidDefinitions = {
      terrain_999998: {
        definitionId: "terrain_999998",
        name: "Invalid",
        tags: [],
        movementCostModifier: terrainCost,
      },
    } satisfies TerrainDefinitionCatalog;

    expect(() =>
      calculateNormalMovementCost(
        createTile("origin", 0, "terrain_999998"),
        createTile("target", 0, "terrain_999998"),
        invalidDefinitions,
      ),
    ).toThrow("movementCostModifier must be between 0 and 2");
  });

  it.each([
    { originElevation: 0, targetElevation: 4 },
    { originElevation: 1, targetElevation: -3 },
  ])("rejects elevation differences outside the inclusive range", (elevations) => {
    expect(() =>
      calculateNormalMovementCost(
        createTile("origin", elevations.originElevation, "terrain_000001"),
        createTile("target", elevations.targetElevation, "terrain_000001"),
        TERRAIN_DEFINITIONS,
      ),
    ).toThrow("elevation difference must be between -3 and 3");
  });
});

/**
 * 方法名：createTile
 * 作用：创建只包含移动成本测试所需字段的合法地块。
 * @param id 测试地块标识。
 * @param elevation 测试地块高度。
 * @param terrainDefinitionId 测试地块使用的基础地形定义标识。
 * @returns 可传入移动成本策略的地块对象。
 */
function createTile(id: string, elevation: number, terrainDefinitionId: string): HexTile {
  return {
    tileId: id as TileId,
    coordinate: { x: 0, y: 0, z: 0 },
    ring: 0,
    elevation,
    terrainDefinitionId,
    regionDefinitionId: "region_000101",
    passability: "passable",
    features: [],
  };
}
