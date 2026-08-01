import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./player-hand-state.ts";
export * from "./hand-card-deck-state.ts";
export * from "./hand-card-config.ts";
export * from "./hand-card-definition.ts";

export const handSystem: SystemScaffold<"hand"> = {
  name: "hand",
  status: "scaffold",
};
