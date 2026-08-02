import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./acquire-hand-cards.ts";
export * from "./discard-excess-hand-cards.ts";
export * from "./effect-handlers/core-effect-handler-registry.ts";
export * from "./effect-handlers/hand-card-draw-effect-handler.ts";
export * from "./effect-handlers/health-restore-effect-handler.ts";
export * from "./effect-handlers/item-obtain-effect-handler.ts";
export * from "./effect-handlers/status-effect-handlers.ts";
export * from "./execute-hand-card-effects.ts";
export * from "./player-hand-state.ts";
export * from "./hand-card-acquisition-definition.ts";
export * from "./hand-card-deck-state.ts";
export * from "./hand-card-config.ts";
export * from "./hand-card-definition.ts";
export * from "./hand-card-effect-context.ts";
export * from "./hand-card-effect-handler.ts";
export * from "./hand-card-effect-handler-registry.ts";
export * from "./hand-card-effect-state-channel.ts";
export * from "./hand-card-flow.ts";
export * from "./resolve-used-hand-card.ts";
export * from "./validate-hand-card-zones.ts";

export const handSystem: SystemScaffold<"hand"> = {
  name: "hand",
  status: "scaffold",
};
