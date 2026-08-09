import { describe, expect, it } from "vitest";

import { validateShopDefinitionCatalog } from "@genesis-rift/game-core";

import { ITEM_DEFINITION_CATALOG } from "../items/item-definitions.ts";
import { SHOP_DEFINITION_CATALOG } from "./shop-definitions.ts";

describe("SHOP_DEFINITION_CATALOG", () => {
  it("contains valid shop item definitions and prices", () => {
    expect(() =>
      validateShopDefinitionCatalog(SHOP_DEFINITION_CATALOG, ITEM_DEFINITION_CATALOG),
    ).not.toThrow();
  });
});
