import type { GameId, PlayerId, TileId } from "@genesis-rift/shared";
import { describe, expect, it, vi } from "vitest";

import type { CharacterResourceState } from "../../character/index.ts";
import { createHandCardEffectExecutionContext } from "../hand-card-effect-context.ts";
import { HandCardEffectHandlerRegistry } from "../hand-card-effect-handler-registry.ts";
import { createHealthRestoreEffectHandler } from "./health-restore-effect-handler.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const TILE_ID = "tile-1" as TileId;
const EFFECT = {
  effectId: "health.restore",
  parameters: { amount: 20 },
} as const;

function createResourceState(current: number): CharacterResourceState<string> {
  return {
    playerId: PLAYER_ID,
    resources: {
      health: { current, minimum: 0, maximum: 100 },
      mana: { current: 30, minimum: 0, maximum: 50 },
    },
  };
}

function createContext() {
  return createHandCardEffectExecutionContext({
    executionId: "execution-health-1",
    gameId: GAME_ID,
    cardId: 1,
    effectIndex: 0,
    sourcePlayerId: PLAYER_ID,
    timing: "active",
    targets: [
      { type: "tile", targetId: TILE_ID },
      { type: "player", targetId: PLAYER_ID },
    ],
    scope: { mapId: "world-map", tileId: TILE_ID },
  });
}

describe("health restore hand card effect handler", () => {
  it("restores only the health resource of player targets", () => {
    const initialState = createResourceState(70);
    const saveState = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createHealthRestoreEffectHandler({
        healthResourceId: "health",
        getCharacterResourceState: (targetId) => (targetId === PLAYER_ID ? initialState : null),
        saveCharacterResourceState: saveState,
      }),
    );

    const result = registry.execute(EFFECT, createContext());

    expect(result).toMatchObject({
      effectId: "health.restore",
      outcome: "applied",
      output: {
        targets: [
          {
            targetPlayerId: PLAYER_ID,
            requestedAmount: 20,
            restoredAmount: 20,
            state: {
              resources: {
                health: { current: 90 },
                mana: { current: 30 },
              },
            },
          },
        ],
      },
    });
    expect(saveState).toHaveBeenCalledTimes(1);
    expect(initialState.resources.health!.current).toBe(70);
  });

  it("clamps healing to maximum health", () => {
    const saveState = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createHealthRestoreEffectHandler({
        healthResourceId: "health",
        getCharacterResourceState: () => createResourceState(95),
        saveCharacterResourceState: saveState,
      }),
    );

    const result = registry.execute(EFFECT, createContext());

    expect(result.output).toMatchObject({
      targets: [{ restoredAmount: 5, state: { resources: { health: { current: 100 } } } }],
    });
  });

  it("skips full-health or missing targets without saving state", () => {
    const saveState = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createHealthRestoreEffectHandler({
        healthResourceId: "health",
        getCharacterResourceState: () => createResourceState(100),
        saveCharacterResourceState: saveState,
      }),
    );

    expect(registry.execute(EFFECT, createContext())).toEqual({
      effectId: "health.restore",
      outcome: "skipped",
      output: null,
    });
    expect(saveState).not.toHaveBeenCalled();
  });
});
