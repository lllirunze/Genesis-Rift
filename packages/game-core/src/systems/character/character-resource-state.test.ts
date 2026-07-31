import type { CharacterResourceDefinitionCatalog, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import {
  decreaseCharacterResource,
  increaseCharacterResource,
  isCharacterResourceDepleted,
  setCharacterResourceCurrentValue,
  spendCharacterResource,
} from "./character-resource-operations.ts";
import {
  createCharacterResourceState,
  getCharacterResource,
  synchronizeCharacterResourceMaximums,
} from "./character-resource-state.ts";

const PLAYER_ID = "player-1" as PlayerId;

const RESOURCE_DEFINITIONS = {
  health: {
    resourceId: "health",
    maximumDerivedAttribute: "maxHealth",
    minimum: 0,
    initialValue: { kind: "maximum" },
  },
  mana: {
    resourceId: "mana",
    maximumDerivedAttribute: "maxMana",
    minimum: 0,
    initialValue: { kind: "minimum" },
  },
} as const satisfies CharacterResourceDefinitionCatalog<"health" | "mana", "maxHealth" | "maxMana">;

const DERIVED_ATTRIBUTES = {
  maxHealth: 100,
  maxMana: 40,
} as const;

describe("character resource state", () => {
  it("initializes multiple resources from data without resource-specific logic", () => {
    const state = createCharacterResourceState(PLAYER_ID, RESOURCE_DEFINITIONS, DERIVED_ATTRIBUTES);

    expect(state).toEqual({
      playerId: PLAYER_ID,
      resources: {
        health: { current: 100, minimum: 0, maximum: 100 },
        mana: { current: 0, minimum: 0, maximum: 40 },
      },
    });
  });

  it("decreases and increases resources while clamping at their boundaries", () => {
    const initial = createCharacterResourceState(
      PLAYER_ID,
      RESOURCE_DEFINITIONS,
      DERIVED_ATTRIBUTES,
    );
    const damaged = decreaseCharacterResource(initial, "health", 130);
    const healed = increaseCharacterResource(damaged.state, "health", 30);

    expect(damaged.resource.current).toBe(0);
    expect(damaged.appliedAmount).toBe(100);
    expect(healed.resource.current).toBe(30);
    expect(healed.appliedAmount).toBe(30);
    expect(initial.resources.health.current).toBe(100);
    expect(isCharacterResourceDepleted(damaged.state, "health")).toBe(true);
  });

  it("requires exact resource availability when spending", () => {
    const initial = createCharacterResourceState(
      PLAYER_ID,
      RESOURCE_DEFINITIONS,
      DERIVED_ATTRIBUTES,
    );
    const restoredMana = increaseCharacterResource(initial, "mana", 15).state;
    const spent = spendCharacterResource(restoredMana, "mana", 10);

    expect(spent.resource.current).toBe(5);
    expect(() => spendCharacterResource(restoredMana, "mana", 16)).toThrow(
      "Insufficient character resource mana",
    );
    expect(restoredMana.resources.mana.current).toBe(15);
  });

  it("sets a resource value with boundary clamping", () => {
    const initial = createCharacterResourceState(
      PLAYER_ID,
      RESOURCE_DEFINITIONS,
      DERIVED_ATTRIBUTES,
    );

    expect(setCharacterResourceCurrentValue(initial, "health", -10).resource.current).toBe(0);
    expect(setCharacterResourceCurrentValue(initial, "mana", 100).resource.current).toBe(40);
  });

  it("preserves current values when maximums increase and truncates them when maximums decrease", () => {
    const initial = createCharacterResourceState(
      PLAYER_ID,
      RESOURCE_DEFINITIONS,
      DERIVED_ATTRIBUTES,
    );
    const damaged = decreaseCharacterResource(initial, "health", 5).state;
    const increased = synchronizeCharacterResourceMaximums(damaged, RESOURCE_DEFINITIONS, {
      maxHealth: 120,
      maxMana: 50,
    });
    const decreased = synchronizeCharacterResourceMaximums(increased, RESOURCE_DEFINITIONS, {
      maxHealth: 80,
      maxMana: 20,
    });

    expect(increased.resources.health).toEqual({ current: 95, minimum: 0, maximum: 120 });
    expect(decreased.resources.health).toEqual({ current: 80, minimum: 0, maximum: 80 });
  });

  it("rejects missing derived attributes and invalid fixed initial values", () => {
    expect(() =>
      createCharacterResourceState(PLAYER_ID, RESOURCE_DEFINITIONS, {
        maxHealth: 100,
      } as Record<"maxHealth" | "maxMana", number>),
    ).toThrow("Missing maximum derived attribute: maxMana");

    const invalidDefinitions = {
      focus: {
        resourceId: "focus",
        maximumDerivedAttribute: "maxFocus",
        minimum: 0,
        initialValue: { kind: "fixed", value: 11 },
      },
    } as const satisfies CharacterResourceDefinitionCatalog<"focus", "maxFocus">;

    expect(() =>
      createCharacterResourceState(PLAYER_ID, invalidDefinitions, { maxFocus: 10 }),
    ).toThrow("focus.initialValue must stay within its boundaries");
    expect(() =>
      getCharacterResource(
        createCharacterResourceState(PLAYER_ID, RESOURCE_DEFINITIONS, DERIVED_ATTRIBUTES),
        "unknown" as "health",
      ),
    ).toThrow("Character resource not found");
  });
});
