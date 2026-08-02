import type { GameId, PlayerId, TileId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import { RandomManager } from "../random/core/random-manager.ts";
import { createMasterSeed } from "../random/core/random-seed.ts";
import {
  createHandCardEffectExecutionContext,
  type HandCardEffectExecutionContext,
} from "./hand-card-effect-context.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const TILE_ID = "tile-1" as TileId;
const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);

function createActiveContext(): HandCardEffectExecutionContext {
  return {
    executionId: "hand-card-execution-1",
    gameId: GAME_ID,
    cardId: 1,
    effectIndex: 0,
    sourcePlayerId: PLAYER_ID,
    timing: "active",
    responseType: null,
    triggerId: null,
    targets: [{ type: "player", targetId: PLAYER_ID }],
    scope: {
      eventId: "event-1",
      battleId: null,
      mapId: "world-map",
      tileId: TILE_ID,
    },
    randomStream: RandomManager.create(MASTER_SEED).getStream("event", "event-1"),
    handCardStateChannel: null,
  };
}

describe("hand card effect execution context", () => {
  it("creates an immutable active execution context with runtime references", () => {
    const input = createActiveContext();
    const context = createHandCardEffectExecutionContext(input);

    expect(context).toEqual(input);
    expect(context).not.toBe(input);
    expect(context.targets).not.toBe(input.targets);
    expect(context.scope).not.toBe(input.scope);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.targets)).toBe(true);
    expect(Object.isFrozen(context.targets[0])).toBe(true);
    expect(Object.isFrozen(context.scope)).toBe(true);
    expect(context.randomStream).toBe(input.randomStream);
    expect(context.handCardStateChannel).toBeNull();
  });

  it("accepts a response context with an explicit response type and trigger", () => {
    const context = createHandCardEffectExecutionContext({
      ...createActiveContext(),
      timing: "response",
      responseType: "damage.beforeResolution",
      triggerId: "damage-resolution-1",
      scope: {
        eventId: null,
        battleId: "battle-1",
        mapId: null,
        tileId: null,
      },
    });

    expect(context.responseType).toBe("damage.beforeResolution");
    expect(context.triggerId).toBe("damage-resolution-1");
    expect(context.scope.battleId).toBe("battle-1");
  });

  it("rejects response metadata on active effects", () => {
    expect(() =>
      createHandCardEffectExecutionContext({
        ...createActiveContext(),
        responseType: "damage.beforeResolution",
        triggerId: "damage-resolution-1",
      }),
    ).toThrow("Active hand card effects must not declare response context");
  });

  it("requires complete response metadata on response effects", () => {
    expect(() =>
      createHandCardEffectExecutionContext({
        ...createActiveContext(),
        timing: "response",
        responseType: null,
        triggerId: null,
      }),
    ).toThrow("must declare a supported response type");
  });

  it("rejects invalid or duplicate target references", () => {
    expect(() =>
      createHandCardEffectExecutionContext({
        ...createActiveContext(),
        targets: [
          { type: "player", targetId: PLAYER_ID },
          { type: "player", targetId: PLAYER_ID },
        ],
      }),
    ).toThrow("Duplicate hand card effect target");

    expect(() =>
      createHandCardEffectExecutionContext({
        ...createActiveContext(),
        targets: [{ type: "unknown", targetId: "target-1" }],
      } as unknown as HandCardEffectExecutionContext),
    ).toThrow("Unsupported hand card effect target type");
  });

  it("requires tile references to belong to a map scope", () => {
    expect(() =>
      createHandCardEffectExecutionContext({
        ...createActiveContext(),
        scope: {
          eventId: null,
          battleId: null,
          mapId: null,
          tileId: TILE_ID,
        },
      }),
    ).toThrow("tile scope requires a map id");
  });

  it("allows effects that do not need targets, world scope, or randomness", () => {
    const context = createHandCardEffectExecutionContext({
      executionId: "hand-card-execution-minimal",
      gameId: GAME_ID,
      cardId: 1,
      effectIndex: 0,
      sourcePlayerId: PLAYER_ID,
      timing: "active",
    });

    expect(context.targets).toEqual([]);
    expect(context.responseType).toBeNull();
    expect(context.triggerId).toBeNull();
    expect(context.scope).toEqual({
      eventId: null,
      battleId: null,
      mapId: null,
      tileId: null,
    });
    expect(context.randomStream).toBeNull();
    expect(context.handCardStateChannel).toBeNull();
  });
});
