import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./status/index.ts";

export const battleSystem: SystemScaffold<"battle"> = {
  name: "battle",
  status: "scaffold",
};
