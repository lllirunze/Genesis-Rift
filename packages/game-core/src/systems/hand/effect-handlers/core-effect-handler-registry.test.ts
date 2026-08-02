import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it, vi } from "vitest";

import { createCharacterStatusState, type StatusDefinitionCatalog } from "../../battle/index.ts";
import type { CharacterResourceState } from "../../character/index.ts";
import { createPlayerInventory } from "../../inventory/index.ts";
import { HandCardEffectHandlerRegistry } from "../hand-card-effect-handler-registry.ts";
import {
  createCoreHandCardEffectHandlerRegistry,
  registerCoreHandCardEffectHandlers,
  type CoreHandCardEffectHandlerDependencies,
} from "./core-effect-handler-registry.ts";

const PLAYER_ID = "player-1" as PlayerId;
const STATUS_DEFINITIONS = {
  "status.focus": {
    definitionId: "status.focus",
    name: "Focus",
    description: "Improves focus for a short duration.",
    kind: "buff",
    tags: ["mental"],
    duration: { turns: 2 },
    maxStacks: 1,
    removal: { dispellable: true, removeOnDeath: true },
    effects: [],
  },
} as const satisfies StatusDefinitionCatalog;
const ITEM_DEFINITIONS = {
  "item.herb": {
    definitionId: "item.herb",
    name: "Herb",
    category: "material",
    quality: "common",
    width: 1,
    height: 1,
    maximumStack: 5,
  },
} as const satisfies ItemDefinitionCatalog;

function createDependencies(): CoreHandCardEffectHandlerDependencies {
  const resourceState: CharacterResourceState<string> = {
    playerId: PLAYER_ID,
    resources: { health: { current: 50, minimum: 0, maximum: 100 } },
  };

  return {
    healthRestore: {
      healthResourceId: "health",
      getCharacterResourceState: () => resourceState,
      saveCharacterResourceState: vi.fn(),
    },
    status: {
      definitions: STATUS_DEFINITIONS,
      getCharacterStatusState: () => createCharacterStatusState(PLAYER_ID),
      saveCharacterStatusState: vi.fn(),
      createStatusInstanceId: () => "status-instance.hand-card",
      getCreatedAtSequence: () => 1,
    },
    itemObtain: {
      definitions: ITEM_DEFINITIONS,
      getPlayerInventoryState: () => createPlayerInventory(PLAYER_ID),
      savePlayerInventoryState: vi.fn(),
      createItemInstanceIds: ({ quantity }) =>
        Array.from({ length: quantity }, (_, index) => `item-instance.hand-card-${index}`),
    },
    handCardDraw: {
      catalog: {},
    },
  };
}

describe("core hand card effect handler registry", () => {
  it("creates a registry containing every currently supported core handler", () => {
    const registry = createCoreHandCardEffectHandlerRegistry(createDependencies());

    expect(registry.has("health.restore")).toBe(true);
    expect(registry.has("status.add")).toBe(true);
    expect(registry.has("status.remove")).toBe(true);
    expect(registry.has("item.obtain")).toBe(true);
    expect(registry.has("handCard.draw")).toBe(true);
  });

  it("can add core handlers to an existing registry", () => {
    const registry = new HandCardEffectHandlerRegistry();

    expect(registerCoreHandCardEffectHandlers(registry, createDependencies())).toBe(registry);
    expect(registry.get("health.restore").effectId).toBe("health.restore");
  });

  it("preserves duplicate registration protection", () => {
    const registry = createCoreHandCardEffectHandlerRegistry(createDependencies());

    expect(() => registerCoreHandCardEffectHandlers(registry, createDependencies())).toThrow(
      "Duplicate hand card effect handler",
    );
  });
});
