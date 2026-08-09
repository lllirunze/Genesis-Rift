import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./equipment-attribute-modifiers.ts";
export * from "./equipment-active-ability-definition.ts";
export * from "./equipment-active-ability-runtime.ts";
export * from "./equipment-active-effect-handler.ts";
export * from "./equipment-config.ts";
export * from "./equipment-definition.ts";
export * from "./equipment-inventory-interaction.ts";
export * from "./equipment-instance.ts";
export * from "./equipment-loadout.ts";
export * from "./use-equipment-active-ability.ts";

/** 当前模块对外公开的只读配置值。 */
export const equipmentSystem: SystemScaffold<"equipment"> = {
  name: "equipment",
  status: "scaffold",
};
