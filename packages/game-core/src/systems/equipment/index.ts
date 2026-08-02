import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./equipment-attribute-modifiers.ts";
export * from "./equipment-config.ts";
export * from "./equipment-definition.ts";
export * from "./equipment-inventory-interaction.ts";
export * from "./equipment-instance.ts";
export * from "./equipment-loadout.ts";

/** 当前模块对外公开的只读配置值。 */
export const equipmentSystem: SystemScaffold<"equipment"> = {
  name: "equipment",
  status: "scaffold",
};
