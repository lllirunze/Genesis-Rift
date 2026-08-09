import type { TileId } from "@genesis-rift/shared";

import type { HexMap } from "../model/hex-map.ts";
import { getRegionDefinition, type RegionDefinitionCatalog } from "../model/region-definition.ts";

/** 描述文明区域交通设施的可用性检查结果。 */
export type CivilizedFacilityEligibility =
  | { readonly allowed: true; readonly reason: null }
  | { readonly allowed: false; readonly reason: "ORIGIN_NOT_CIVILIZED" | "TARGET_NOT_CIVILIZED" };

/**
 * 方法名：evaluateCivilizedFacilityEligibility
 * 作用：检查交通设施的起点和终点是否均处于文明区域，普通逐格移动不使用本规则。
 * @param map 当前六边形地图。
 * @param regionDefinitions 地图区域静态定义注册表。
 * @param originTileId 设施使用者当前所在的起点地块。
 * @param targetTileId 交通设施配置指向的目标地块。
 * @returns 允许使用或首个稳定拒绝原因。
 * @throws 起点或目标地块不存在时抛出错误。
 */
export function evaluateCivilizedFacilityEligibility(
  map: HexMap,
  regionDefinitions: RegionDefinitionCatalog,
  originTileId: TileId,
  targetTileId: TileId,
): CivilizedFacilityEligibility {
  const origin = map.getTileById(originTileId);
  const target = map.getTileById(targetTileId);

  if (origin === undefined || target === undefined) {
    throw new Error("Civilized facility endpoints must exist on the map");
  }

  if (getRegionDefinition(regionDefinitions, origin.regionDefinitionId).category !== "civilized") {
    return Object.freeze({ allowed: false, reason: "ORIGIN_NOT_CIVILIZED" });
  }

  if (getRegionDefinition(regionDefinitions, target.regionDefinitionId).category !== "civilized") {
    return Object.freeze({ allowed: false, reason: "TARGET_NOT_CIVILIZED" });
  }

  return Object.freeze({ allowed: true, reason: null });
}
