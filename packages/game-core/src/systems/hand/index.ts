import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./acquire-hand-cards.ts";
export * from "./discard-excess-hand-cards.ts";
export * from "./player-hand-state.ts";
export * from "./hand-card-acquisition-definition.ts";
export * from "./hand-card-deck-state.ts";
export * from "./hand-card-config.ts";
export * from "./hand-card-definition.ts";
export * from "./hand-card-flow.ts";
export * from "./resolve-used-hand-card.ts";
export * from "./validate-hand-card-zones.ts";

export const handSystem: SystemScaffold<"hand"> = {
  name: "hand",
  status: "scaffold",
};
