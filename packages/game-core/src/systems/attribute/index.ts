import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./calculate-derived-attribute.ts";

export const attributeSystem: SystemScaffold<"attribute"> = {
  name: "attribute",
  status: "scaffold",
};
