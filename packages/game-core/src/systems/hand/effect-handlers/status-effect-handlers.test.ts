import type { GameId, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it, vi } from "vitest";

import {
  applyStatusToCharacter,
  createCharacterStatusState,
  type StatusDefinitionCatalog,
} from "../../battle/status/index.ts";
import { createHandCardEffectExecutionContext } from "../hand-card-effect-context.ts";
import { HandCardEffectHandlerRegistry } from "../hand-card-effect-handler-registry.ts";
import {
  createStatusAddEffectHandler,
  createStatusRemoveEffectHandler,
  type StatusEffectHandlerDependencies,
} from "./status-effect-handlers.ts";

const GAME_ID = "game-1" as GameId;
const PLAYER_ID = "player-1" as PlayerId;
const DEFINITIONS = {
  "status.focus": {
    definitionId: "status.focus",
    name: "Focus",
    description: "Improves insight for a short duration.",
    kind: "buff",
    tags: ["mental"],
    duration: { turns: 3 },
    maxStacks: 3,
    removal: { dispellable: true, removeOnDeath: true },
    effects: [],
  },
  "status.contract": {
    definitionId: "status.contract",
    name: "Contract",
    description: "Represents a protected permanent agreement.",
    kind: "buff",
    tags: ["contract"],
    duration: { turns: 999_999 },
    maxStacks: 1,
    removal: { dispellable: false, removeOnDeath: false },
    effects: [],
  },
} as const satisfies StatusDefinitionCatalog;

/**
 * 方法名：createContext
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
function createContext() {
  return createHandCardEffectExecutionContext({
    executionId: "execution-status-1",
    gameId: GAME_ID,
    cardId: 1,
    effectIndex: 0,
    sourcePlayerId: PLAYER_ID,
    timing: "active",
    targets: [{ type: "player", targetId: PLAYER_ID }],
  });
}

/**
 * 方法名：createDependencies
 * 作用：创建并校验该方法所负责的业务对象。
 * @param state 当前业务状态。
 * @param saveState 方法所需的 saveState 参数。
 * @returns 本次处理得到的结果。
 */
function createDependencies(
  state: ReturnType<typeof createCharacterStatusState>,
  saveState = vi.fn(),
): StatusEffectHandlerDependencies {
  return {
    definitions: DEFINITIONS,
    getCharacterStatusState: () => state,
    saveCharacterStatusState: saveState,
    createStatusInstanceId: (_context, targetId, definitionId) =>
      `status-instance:${targetId}:${definitionId}`,
    getCreatedAtSequence: () => 10,
  };
}

describe("status hand card effect handlers", () => {
  it("applies the configured number of stacks through the existing status rules", () => {
    const saveState = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createStatusAddEffectHandler(
        createDependencies(createCharacterStatusState(PLAYER_ID), saveState),
      ),
    );

    const result = registry.execute(
      {
        effectId: "status.add",
        parameters: { statusDefinitionId: "status.focus", stacks: 2 },
      },
      createContext(),
    );

    expect(result).toMatchObject({
      effectId: "status.add",
      outcome: "applied",
      output: {
        targets: [
          {
            targetPlayerId: PLAYER_ID,
            requestedStacks: 2,
            addedStacks: 2,
            currentStacks: 2,
            state: {
              instances: [
                {
                  definitionId: "status.focus",
                  currentStacks: 2,
                  remainingTurns: 3,
                  createdAtSequence: 10,
                },
              ],
            },
          },
        ],
      },
    });
    expect(saveState).toHaveBeenCalledTimes(1);
  });

  it("removes a dispellable status by definition id", () => {
    const saveState = vi.fn();
    const initial = applyStatusToCharacter(createCharacterStatusState(PLAYER_ID), DEFINITIONS, {
      definitionId: "status.focus",
      newInstanceId: "status-instance.focus",
      sourceId: "event-1",
      createdAtSequence: 1,
    }).state;
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(createStatusRemoveEffectHandler(createDependencies(initial, saveState)));

    const result = registry.execute(
      {
        effectId: "status.remove",
        parameters: { statusDefinitionId: "status.focus" },
      },
      createContext(),
    );

    expect(result).toMatchObject({
      effectId: "status.remove",
      outcome: "applied",
      output: {
        targets: [
          {
            targetPlayerId: PLAYER_ID,
            removedStatusInstanceId: "status-instance.focus",
            state: { instances: [] },
          },
        ],
      },
    });
    expect(saveState).toHaveBeenCalledTimes(1);
  });

  it("skips removal when the status is missing or protected", () => {
    const protectedState = applyStatusToCharacter(
      createCharacterStatusState(PLAYER_ID),
      DEFINITIONS,
      {
        definitionId: "status.contract",
        newInstanceId: "status-instance.contract",
        sourceId: "event-1",
        createdAtSequence: 1,
      },
    ).state;
    const saveState = vi.fn();
    const registry = new HandCardEffectHandlerRegistry();
    registry.register(
      createStatusRemoveEffectHandler(createDependencies(protectedState, saveState)),
    );

    expect(
      registry.execute(
        {
          effectId: "status.remove",
          parameters: { statusDefinitionId: "status.contract" },
        },
        createContext(),
      ),
    ).toEqual({ effectId: "status.remove", outcome: "skipped", output: null });
    expect(saveState).not.toHaveBeenCalled();
  });
});
