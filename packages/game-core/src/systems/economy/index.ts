import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./coin.ts";

export const economySystem: SystemScaffold<"economy"> = {
  name: "economy",
  status: "scaffold",
};
