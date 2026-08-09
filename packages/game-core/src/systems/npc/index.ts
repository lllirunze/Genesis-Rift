import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./craft-at-npc.ts";
export * from "./npc-config.ts";
export * from "./npc-definition.ts";
export * from "./npc-interaction.ts";
export * from "./npc-runtime-state.ts";
export * from "./purchase-from-npc-shop.ts";
export * from "./shop-definition.ts";

/** 当前模块对外公开的只读配置值。 */
export const npcSystem: SystemScaffold<"npc"> = {
  name: "npc",
  status: "scaffold",
};
