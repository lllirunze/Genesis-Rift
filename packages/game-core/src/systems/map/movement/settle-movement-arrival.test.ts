import { describe, expect, it } from "vitest";

import type { TileId } from "@genesis-rift/shared";

import { settleMovementArrival } from "./settle-movement-arrival.ts";
describe("settleMovementArrival", () => {
  it("settles region, tile event and forced displacement in documented order", () => {
    const result = settleMovementArrival("tile_000001" as TileId, [
      {
        phase: "FORCED_DISPLACEMENT",
        handlerId: "displacement",
        settle: () => ({ tileId: "tile_000003" as TileId, triggeredSourceIds: [] }),
      },
      {
        phase: "TILE_EVENT",
        handlerId: "event",
        settle: () => ({ tileId: "tile_000002" as TileId, triggeredSourceIds: [] }),
      },
      { phase: "REGION", handlerId: "region", settle: (state) => state },
    ]);
    expect(result.processedHandlerIds).toEqual(["region", "event", "displacement"]);
    expect(result.state.tileId).toBe("tile_000003");
  });
});
