import { describe, expect, it, vi } from "vitest";

import type { EventDefinition } from "./event-definition.ts";
import { EventEffectHandlerRegistry } from "./event-effect-handler-registry.ts";
import { createStandardEventEffectHandlerRegistry } from "./event-effect-handlers.ts";
import type { RevealedEventInstance } from "./event-instance.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import {
  beginDirectEventResolution,
  completeEventResolution,
  EventEffectSequenceExecutionError,
  selectEventOption,
} from "./resolve-event.ts";

const CONTEXT: EventConditionEvaluationContext = {
  regionDefinitionId: null,
  terrainDefinitionId: null,
  featureIds: new Set(),
  weatherId: null,
  periodId: "day",
  player: {
    level: 1,
    identityId: "identity.test",
    raceId: "race.test",
    faithId: "faith.test",
    isInBattle: false,
    itemQuantities: new Map(),
    equippedDefinitionIds: new Set(),
    resourceValues: new Map([["resource.health", 4]]),
  },
  questStages: new Map(),
  dungeonId: null,
  worldStateIds: new Set(),
  revealedEventIds: new Set(),
  isFirstVisit: false,
};

const REVEALED_INSTANCE: RevealedEventInstance = {
  instanceId: "event-instance-1",
  eventId: "event.test.resolution",
  triggeringPlayerId: "player-1",
  sourcePoolIds: ["event-pool.test"],
  triggeredAtTurn: 2,
  status: "REVEALED",
  revealedAtTurn: 2,
};

const CHOICE_DEFINITION: EventDefinition = {
  eventId: REVEALED_INSTANCE.eventId,
  name: "Resolution Test",
  description: "An event used to test runtime resolution.",
  triggerCondition: null,
  category: "common",
  rarity: "common",
  tags: ["test"],
  revealMode: "FORCED",
  repeatRule: "repeatable",
  resolution: {
    type: "CHOICE",
    options: [
      {
        optionId: "accept",
        name: "Accept",
        description: "Accept the reward.",
        availabilityCondition: null,
        effects: [
          {
            effectKey: "grantCoin",
            effectId: "coin.modify",
            targetType: "TRIGGER_PLAYER",
            parameters: { amount: 3 },
            failurePolicy: "STOP",
          },
          {
            effectKey: "startBattle",
            effectId: "battle.start",
            targetType: "TRIGGER_PLAYER",
            parameters: { encounterDefinitionId: "encounter.test" },
            failurePolicy: "STOP",
          },
        ],
      },
      {
        optionId: "locked",
        name: "Locked",
        description: "Requires more health.",
        availabilityCondition: {
          type: "CONDITION",
          conditionId: "resource.atLeast",
          parameters: { resourceId: "resource.health", amount: 5 },
        },
        effects: [],
      },
    ],
  },
  duration: { type: "IMMEDIATE" },
  baseWeight: 100,
  cooldownTurns: 0,
};

describe("event resolution", () => {
  it("allows only the triggering player to select an available option", () => {
    expect(() =>
      selectEventOption(REVEALED_INSTANCE, CHOICE_DEFINITION, {
        actingPlayerId: "player-2",
        optionId: "accept",
        selectedAtTurn: 2,
        conditionContext: CONTEXT,
      }),
    ).toThrow("Only the triggering player");

    expect(() =>
      selectEventOption(REVEALED_INSTANCE, CHOICE_DEFINITION, {
        actingPlayerId: "player-1",
        optionId: "locked",
        selectedAtTurn: 2,
        conditionContext: CONTEXT,
      }),
    ).toThrow("not currently available");
  });

  it("executes basic effects and returns complex effects as deferred instructions", () => {
    const modifyCoin = vi.fn(() => ({ balance: 8 }));
    const registry = createStandardEventEffectHandlerRegistry({
      modifyCharacterResource: vi.fn(),
      modifyCoin,
      obtainItem: vi.fn(),
    });
    const resolving = selectEventOption(REVEALED_INSTANCE, CHOICE_DEFINITION, {
      actingPlayerId: "player-1",
      optionId: "accept",
      selectedAtTurn: 2,
      conditionContext: CONTEXT,
    });
    const resolved = completeEventResolution(resolving, CHOICE_DEFINITION, registry, {
      resolvedAtTurn: 2,
    });

    expect(modifyCoin).toHaveBeenCalledOnce();
    expect(resolved).toMatchObject({
      status: "RESOLVED",
      selectedOptionId: "accept",
      effectResults: [
        { effectKey: "grantCoin", outcome: "APPLIED", output: { balance: 8 } },
        {
          effectKey: "startBattle",
          outcome: "DEFERRED",
          output: {
            effectId: "battle.start",
            targetType: "TRIGGER_PLAYER",
            parameters: { encounterDefinitionId: "encounter.test" },
          },
        },
      ],
    });
  });

  it("supports direct resolution without a player option", () => {
    const directDefinition: EventDefinition = {
      ...CHOICE_DEFINITION,
      resolution: {
        type: "DIRECT",
        effects: [
          {
            effectKey: "grantCoin",
            effectId: "coin.modify",
            targetType: "TRIGGER_PLAYER",
            parameters: { amount: 1 },
            failurePolicy: "STOP",
          },
        ],
      },
    };

    expect(
      beginDirectEventResolution(REVEALED_INSTANCE, directDefinition, { startedAtTurn: 2 }),
    ).toMatchObject({ status: "RESOLVING", selectedOptionId: null });
  });

  it("rejects repeated selection and repeated completion at runtime", () => {
    const registry = createStandardEventEffectHandlerRegistry({
      modifyCharacterResource: vi.fn(),
      modifyCoin: vi.fn(),
      obtainItem: vi.fn(),
    });
    const resolving = selectEventOption(REVEALED_INSTANCE, CHOICE_DEFINITION, {
      actingPlayerId: "player-1",
      optionId: "accept",
      selectedAtTurn: 2,
      conditionContext: CONTEXT,
    });

    expect(() =>
      selectEventOption(resolving as unknown as RevealedEventInstance, CHOICE_DEFINITION, {
        actingPlayerId: "player-1",
        optionId: "accept",
        selectedAtTurn: 2,
        conditionContext: CONTEXT,
      }),
    ).toThrow("must be REVEALED");

    const resolved = completeEventResolution(resolving, CHOICE_DEFINITION, registry, {
      resolvedAtTurn: 2,
    });

    expect(() =>
      completeEventResolution(
        resolved as unknown as typeof resolving,
        CHOICE_DEFINITION,
        registry,
        { resolvedAtTurn: 2 },
      ),
    ).toThrow("must be RESOLVING");
  });

  it("records CONTINUE failures and interrupts STOP failures", () => {
    const registry = new EventEffectHandlerRegistry();
    registry.register({
      effectId: "coin.modify",
      execute() {
        throw new Error("Coin service unavailable");
      },
    });
    const resolving = beginDirectEventResolution(
      REVEALED_INSTANCE,
      {
        ...CHOICE_DEFINITION,
        resolution: {
          type: "DIRECT",
          effects: [
            {
              effectKey: "grantCoin",
              effectId: "coin.modify",
              targetType: "TRIGGER_PLAYER",
              parameters: { amount: 1 },
              failurePolicy: "CONTINUE",
            },
          ],
        },
      },
      { startedAtTurn: 2 },
    );
    const continued = completeEventResolution(
      resolving,
      {
        ...CHOICE_DEFINITION,
        resolution: {
          type: "DIRECT",
          effects: [
            {
              effectKey: "grantCoin",
              effectId: "coin.modify",
              targetType: "TRIGGER_PLAYER",
              parameters: { amount: 1 },
              failurePolicy: "CONTINUE",
            },
          ],
        },
      },
      registry,
      { resolvedAtTurn: 2 },
    );

    expect(continued.effectResults[0]).toMatchObject({
      outcome: "FAILED",
      failureReason: "Coin service unavailable",
    });

    const stopDefinition: EventDefinition = {
      ...CHOICE_DEFINITION,
      resolution: {
        type: "DIRECT",
        effects: [
          {
            effectKey: "grantCoin",
            effectId: "coin.modify",
            targetType: "TRIGGER_PLAYER",
            parameters: { amount: 1 },
            failurePolicy: "STOP",
          },
        ],
      },
    };
    const stopInstance = beginDirectEventResolution(REVEALED_INSTANCE, stopDefinition, {
      startedAtTurn: 2,
    });

    expect(() =>
      completeEventResolution(stopInstance, stopDefinition, registry, { resolvedAtTurn: 2 }),
    ).toThrow(EventEffectSequenceExecutionError);
  });
});
