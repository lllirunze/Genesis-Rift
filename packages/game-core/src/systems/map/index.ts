import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./geometry/cube-coordinate.ts";
export * from "./geometry/hex-direction.ts";
export * from "./model/hex-tile.ts";

export const mapSystem: SystemScaffold<"map"> = {
  name: "map",
  status: "scaffold",
};
