import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import type { HexMap } from "../model/hex-map.ts";
import type { ForcedDisplacementDefinition } from "./forced-displacement-definition.ts";

/** 描述强制位移目标规划时可读取的地图与起始位置。 */
export interface ForcedDisplacementPlanningContext {
  readonly map: HexMap;
  readonly originTileId: TileId;
}

/** 描述具体强制位移规划器生成的目标坐标序列。 */
export interface ForcedDisplacementPlan {
  readonly definitionId: string;
  readonly targetCoordinates: readonly CubeCoordinate[];
}

/**
 * 由狂风、洪水、击退或空间裂缝等具体业务实现的强制位移规划接口。
 * 规划器只负责决定目标序列，地图边界、阻挡、高度和探索由统一结算器处理。
 */
export interface ForcedDisplacementPlanner<
  Parameters extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> {
  readonly plannerId: string;

  createPlan(
    definition: ForcedDisplacementDefinition<Parameters>,
    context: ForcedDisplacementPlanningContext,
  ): ForcedDisplacementPlan;
}
