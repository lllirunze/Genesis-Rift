import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./character-state.ts";
export * from "./create-character.ts";
export * from "./update-primary-attributes.ts";

export const characterSystem: SystemScaffold<"character"> = {
  name: "character",
  status: "scaffold",
};
