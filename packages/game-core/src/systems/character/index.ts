import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./character-state.ts";
export * from "./character-resource-operations.ts";
export * from "./character-resource-state.ts";
export * from "./create-character.ts";
export * from "./update-primary-attributes.ts";

/** 当前模块对外公开的只读配置值。 */
export const characterSystem: SystemScaffold<"character"> = {
  name: "character",
  status: "scaffold",
};
