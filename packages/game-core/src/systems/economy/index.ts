import type { SystemScaffold } from "../system-scaffold.ts";

export * from "./coin.ts";
export * from "./purchase-item-with-coin.ts";

export const economySystem: SystemScaffold<"economy"> = {
  name: "economy",
  status: "scaffold",
};
