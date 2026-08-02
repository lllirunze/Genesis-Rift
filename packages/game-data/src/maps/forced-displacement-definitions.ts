import type { ForcedDisplacementDefinition } from "@genesis-rift/game-core";

/** 狂风逐格推动角色，遇到边界、障碍或危险高度时停在最后合法地块。 */
export const WIND_GUST_DISPLACEMENT_DEFINITION = {
  definitionId: "displacement.windGust",
  name: "WindGust",
  typeId: "windGust",
  plannerId: "directionalPush",
  mode: "PATH",
  boundaryBehavior: "STOP",
  obstructionBehavior: "STOP",
  elevationRule: "NORMAL_LIMIT",
  recordsExploration: true,
  triggersArrivalEffects: true,
  endsActiveMovement: true,
  parameters: {
    distance: 2,
  },
} as const satisfies ForcedDisplacementDefinition;

/** 洪水逐格冲动角色，距离更远但仍会被正常地图阻挡。 */
export const FLOOD_CURRENT_DISPLACEMENT_DEFINITION = {
  definitionId: "displacement.floodCurrent",
  name: "FloodCurrent",
  typeId: "floodCurrent",
  plannerId: "directionalPush",
  mode: "PATH",
  boundaryBehavior: "STOP",
  obstructionBehavior: "STOP",
  elevationRule: "NORMAL_LIMIT",
  recordsExploration: true,
  triggersArrivalEffects: true,
  endsActiveMovement: true,
  parameters: {
    distance: 3,
  },
} as const satisfies ForcedDisplacementDefinition;

/** 空间裂缝直接选择最终目标，不处理起点和终点之间的普通地块。 */
export const SPATIAL_RIFT_DISPLACEMENT_DEFINITION = {
  definitionId: "displacement.spatialRift",
  name: "SpatialRift",
  typeId: "spatialRift",
  plannerId: "targetTeleport",
  mode: "TELEPORT",
  boundaryBehavior: "FAIL",
  obstructionBehavior: "FAIL",
  elevationRule: "IGNORE",
  recordsExploration: true,
  triggersArrivalEffects: true,
  endsActiveMovement: true,
  parameters: {},
} as const satisfies ForcedDisplacementDefinition;

/** 当前版本提供的强制位移静态定义集合。 */
export const FORCED_DISPLACEMENT_DEFINITIONS = Object.freeze([
  WIND_GUST_DISPLACEMENT_DEFINITION,
  FLOOD_CURRENT_DISPLACEMENT_DEFINITION,
  SPATIAL_RIFT_DISPLACEMENT_DEFINITION,
]);
