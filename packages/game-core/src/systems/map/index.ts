import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./map-config.ts";
export * from "./map-content-config.ts";
export * from "./connection/settle-special-connection.ts";
export * from "./connection/special-connection-config.ts";
export * from "./connection/special-connection-definition.ts";
export * from "./connection/special-connection-state.ts";
export * from "./displacement/forced-displacement-config.ts";
export * from "./displacement/forced-displacement-definition.ts";
export * from "./displacement/forced-displacement-planner.ts";
export * from "./displacement/forced-displacement-planner-registry.ts";
export * from "./displacement/settle-forced-displacement.ts";
export * from "./exploration/player-exploration-state.ts";
export * from "./geometry/cube-coordinate.ts";
export * from "./geometry/cube-coordinate-key.ts";
export * from "./geometry/hex-direction.ts";
export * from "./geometry/hex-line.ts";
export * from "./generation/generate-base-map-coordinates.ts";
export * from "./movement/movement-config.ts";
export * from "./movement/movement-cost-policy.ts";
export * from "./movement/normal-movement.ts";
export * from "./movement/normal-movement-pathfinding.ts";
export * from "./movement/settle-normal-movement.ts";
export * from "./model/hex-map.ts";
export * from "./model/hex-tile.ts";
export * from "./model/map-content-definition-catalog.ts";
export * from "./model/region-definition.ts";
export * from "./model/terrain-definition.ts";
export * from "./model/tile-feature.ts";
export * from "./vision/calculate-current-vision.ts";
export * from "./vision/vision-config.ts";

/** 当前模块对外公开的只读配置值。 */
export const mapSystem: SystemScaffold<"map"> = {
  name: "map",
  status: "scaffold",
};
