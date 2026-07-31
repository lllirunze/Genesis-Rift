import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./equipment-attribute-modifiers.ts";
export * from "./equipment-definition.ts";
export * from "./equipment-inventory-interaction.ts";
export * from "./equipment-instance.ts";
export * from "./equipment-loadout.ts";

export const equipmentSystem: SystemScaffold<"equipment"> = {
  name: "equipment",
  status: "scaffold",
};
