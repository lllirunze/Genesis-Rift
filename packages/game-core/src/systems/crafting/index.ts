import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./blueprint-definition.ts";
export * from "./crafting-config.ts";
export * from "./craft-item.ts";
export * from "./learn-blueprint.ts";
export * from "./player-blueprint-state.ts";

/** 当前模块对外公开的只读配置值。 */
export const craftingSystem: SystemScaffold<"crafting"> = {
  name: "crafting",
  status: "scaffold",
};
