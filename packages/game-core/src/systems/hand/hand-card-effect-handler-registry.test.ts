import type { GameId, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it, vi } from "vitest";

import { createHandCardEffectExecutionContext } from "./hand-card-effect-context.ts";
import type { HandCardEffectHandler } from "./hand-card-effect-handler.ts";
import { HandCardEffectHandlerRegistry } from "./hand-card-effect-handler-registry.ts";
import type { HandCardEffectDefinition } from "./hand-card-definition.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const HEALTH_RESTORE_EFFECT = {
  effectId: "health.restore",
  parameters: { amount: 5 },
} as const satisfies HandCardEffectDefinition;
const CONTEXT = createHandCardEffectExecutionContext({
  executionId: "hand-card-execution-1",
  gameId: GAME_ID,
  cardId: 1,
  effectIndex: 0,
  sourcePlayerId: PLAYER_ID,
  timing: "active",
  targets: [{ type: "player", targetId: PLAYER_ID }],
});

interface HealthRestoreOutput {
  readonly restoredAmount: number;
}

function createHealthRestoreHandler(): HandCardEffectHandler<
  "health.restore",
  HealthRestoreOutput
> {
  return {
    effectId: "health.restore",
    execute(effect) {
      return {
        effectId: "health.restore",
        outcome: "applied",
        output: { restoredAmount: effect.parameters.amount },
      };
    },
  };
}

describe("hand card effect handler registry", () => {
  it("registers, finds, and executes an effect-specific handler", () => {
    const registry = new HandCardEffectHandlerRegistry();
    const handler = createHealthRestoreHandler();
    const execute = vi.spyOn(handler, "execute");

    registry.register(handler);
    const result = registry.execute(HEALTH_RESTORE_EFFECT, CONTEXT);

    expect(registry.has("health.restore")).toBe(true);
    expect(registry.get("health.restore")).toBe(handler);
    expect(execute).toHaveBeenCalledWith(HEALTH_RESTORE_EFFECT, CONTEXT);
    expect(result).toEqual({
      effectId: "health.restore",
      outcome: "applied",
      output: { restoredAmount: 5 },
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects duplicate handler registration", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createHealthRestoreHandler());

    expect(() => registry.register(createHealthRestoreHandler())).toThrow(
      "Duplicate hand card effect handler: health.restore",
    );
  });

  it("rejects unknown and missing handlers", () => {
    const registry = new HandCardEffectHandlerRegistry();

    expect(() => registry.get("health.restore")).toThrow(
      "Missing hand card effect handler: health.restore",
    );
    expect(() => registry.has("unknown.effect" as "health.restore")).toThrow(
      "Unsupported hand card effect handler id: unknown.effect",
    );
  });

  it("rejects a handler result belonging to another effect", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register({
      effectId: "health.restore",
      execute() {
        return {
          effectId: "damage.reduce",
          outcome: "applied",
          output: null,
        };
      },
    } as unknown as HandCardEffectHandler<"health.restore">);

    expect(() => registry.execute(HEALTH_RESTORE_EFFECT, CONTEXT)).toThrow(
      "expected health.restore, received damage.reduce",
    );
  });

  it("supports a skipped result without requiring unrelated output", () => {
    const registry = new HandCardEffectHandlerRegistry();
    registry.register({
      effectId: "health.restore",
      execute() {
        return {
          effectId: "health.restore",
          outcome: "skipped",
          output: null,
        };
      },
    });

    expect(registry.execute(HEALTH_RESTORE_EFFECT, CONTEXT)).toEqual({
      effectId: "health.restore",
      outcome: "skipped",
      output: null,
    });
  });
});
