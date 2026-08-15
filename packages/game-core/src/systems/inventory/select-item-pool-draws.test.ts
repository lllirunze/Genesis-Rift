import { describe, expect, it } from "vitest";

import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";

import { selectItemPoolDraws, validateItemPoolDefinitionCatalog } from "./index.ts";

const ITEM_DEFINITIONS = {
  item_000001: {
    definitionId: "item_000001",
    name: "Test Item",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const;

const ITEM_POOLS = {
  "item-pool.test": {
    poolId: "item-pool.test",
    entries: [{ itemDefinitionId: "item_000001", quantity: 2, weight: 100 }],
  },
} as const;

describe("selectItemPoolDraws", () => {
  it("returns configured item quantities using the provided deterministic random stream", () => {
    validateItemPoolDefinitionCatalog(ITEM_POOLS, ITEM_DEFINITIONS);
    const stream = RandomStream.create(
      "event",
      "item-pool-test",
      createRandomStreamSeed("0000000000000001"),
    );

    expect(selectItemPoolDraws(stream, ITEM_POOLS, "item-pool.test", 3)).toEqual([
      { itemDefinitionId: "item_000001", quantity: 2 },
      { itemDefinitionId: "item_000001", quantity: 2 },
      { itemDefinitionId: "item_000001", quantity: 2 },
    ]);
  });
});
