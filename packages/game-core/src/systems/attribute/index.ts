import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./aggregate-attribute-modifiers.ts";
export * from "./attribute-modifier.ts";
export * from "./calculate-derived-attribute.ts";
export * from "./calculate-derived-attributes.ts";
export * from "./character-attribute-snapshot.ts";

export const attributeSystem: SystemScaffold<"attribute"> = {
  name: "attribute",
  status: "scaffold",
};
