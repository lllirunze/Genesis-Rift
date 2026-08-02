import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./map-config.ts";
export * from "./map-content-config.ts";
export * from "./geometry/cube-coordinate.ts";
export * from "./geometry/cube-coordinate-key.ts";
export * from "./geometry/hex-direction.ts";
export * from "./generation/generate-base-map-coordinates.ts";
export * from "./model/hex-map.ts";
export * from "./model/hex-tile.ts";
export * from "./model/map-content-definition-catalog.ts";
export * from "./model/region-definition.ts";
export * from "./model/terrain-definition.ts";
export * from "./model/tile-feature.ts";

export const mapSystem: SystemScaffold<"map"> = {
  name: "map",
  status: "scaffold",
};
