import type { DerivedAttributeFormulaConfig, PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import type { CharacterState } from "../../character/index.ts";
import { applyStatus } from "./apply-status.ts";
import {
  aggregateStatusAttributeModifiers,
  createCharacterAttributeSnapshotWithStatuses,
  createStatusAttributeModifiers,
} from "./status-attribute-modifiers.ts";
import type { StatusDefinition } from "./status-definition.ts";
import { createStatusInstance, type StatusInstance } from "./status-instance.ts";

const PLAYER_ID = "player-1" as PlayerId;

const ZERO_PRIMARY_ATTRIBUTES = {
  strength: 0,
  constitution: 0,
  spirit: 0,
  agility: 0,
  insight: 0,
} as const;

const FOCUS: StatusDefinition = {
  definitionId: "status.focus",
  name: "Focus",
  description: "Improves insight and movement range per stack.",
  kind: "buff",
  tags: ["mental"],
  duration: { turns: 3 },
  maxStacks: 3,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [
    {
      effectType: "attribute_modifier",
      effectId: "insight",
      targetType: "primary",
      targetAttribute: "insight",
      valuePerStack: 1,
    },
    {
      effectType: "attribute_modifier",
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      valuePerStack: 2,
    },
  ],
};

/**
 * 方法名：createInstance
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definition 方法所需的 definition 参数。
 * @param targetId 方法所需的 targetId 参数。
 * @returns 本次处理得到的结果。
 */
function createInstance(
  definition: StatusDefinition = FOCUS,
  targetId: string = PLAYER_ID,
): StatusInstance {
  return createStatusInstance({
    instanceId: "status-instance-1",
    definition,
    sourceId: "character-source",
    targetId,
    createdAtSequence: 1,
  });
}

/**
 * 方法名：applyStacks
 * 作用：执行该方法负责的业务规则并返回结算结果。
 * @param instance 方法所需的 instance 参数。
 * @param definition 方法所需的 definition 参数。
 * @param stacks 方法所需的 stacks 参数。
 * @returns 本次处理得到的结果。
 */
function applyStacks(
  instance: StatusInstance,
  definition: StatusDefinition,
  stacks: number,
): StatusInstance {
  let result = instance;

  for (let current = 0; current < stacks; current += 1) {
    result = applyStatus(result, definition).instance;
  }

  return result;
}

describe("status attribute modifiers", () => {
  it("multiplies primary and derived effects by the active stack count", () => {
    const instance = applyStacks(createInstance(), FOCUS, 3);

    expect(createStatusAttributeModifiers([instance], { [FOCUS.definitionId]: FOCUS })).toEqual([
      {
        modifierId: "status.status-instance-1.insight",
        sourceId: "status-instance-1",
        sourceType: "status",
        targetType: "primary",
        targetAttribute: "insight",
        value: 3,
      },
      {
        modifierId: "status.status-instance-1.movement-range",
        sourceId: "status-instance-1",
        sourceType: "status",
        targetType: "derived",
        targetAttribute: "movementRange",
        value: 6,
      },
    ]);
  });

  it("ignores zero-stack and expired instances", () => {
    const inactive = createInstance();
    const expired = {
      ...applyStatus(createInstance(), FOCUS).instance,
      instanceId: "status-instance-expired",
      remainingTurns: 0,
    };

    expect(
      createStatusAttributeModifiers([inactive, expired], { [FOCUS.definitionId]: FOCUS }),
    ).toEqual([]);
  });

  it("aggregates multiple active status instances", () => {
    const first = applyStatus(createInstance(), FOCUS).instance;
    const second = {
      ...applyStatus(createInstance(), FOCUS).instance,
      instanceId: "status-instance-2",
    };

    expect(
      aggregateStatusAttributeModifiers([first, second], { [FOCUS.definitionId]: FOCUS }),
    ).toEqual({
      primaryDynamicOffset: {
        strength: 0,
        constitution: 0,
        spirit: 0,
        agility: 0,
        insight: 2,
      },
      derivedDynamicOffset: {
        movementRange: 4,
      },
    });
  });

  it("feeds status modifiers into the complete character snapshot", () => {
    const character: CharacterState = {
      playerId: PLAYER_ID,
      identityId: "identity.test",
      raceId: "race.test",
      currentPrimaryAttributes: {
        strength: 5,
        constitution: 5,
        spirit: 5,
        agility: 5,
        insight: 5,
      },
      attributeModifiers: [
        {
          modifierId: "event.agility",
          sourceId: "event-1",
          sourceType: "event",
          targetType: "primary",
          targetAttribute: "agility",
          value: 1,
        },
      ],
      levelProgression: {
        currentLevel: 1,
        currentExperience: 0,
      },
    };
    const movementRangeConfig: DerivedAttributeFormulaConfig = {
      coefficients: { ...ZERO_PRIMARY_ATTRIBUTES, agility: 1 },
      primaryStaticOffset: ZERO_PRIMARY_ATTRIBUTES,
      derivedStaticOffset: 0,
      roundingMode: "floor",
      minimum: 0,
      maximum: null,
    };
    const instance = applyStacks(createInstance(), FOCUS, 2);
    const snapshot = createCharacterAttributeSnapshotWithStatuses(
      character,
      { movementRange: movementRangeConfig },
      [instance],
      { [FOCUS.definitionId]: FOCUS },
    );

    expect(snapshot.effectivePrimaryAttributes).toEqual({
      strength: 5,
      constitution: 5,
      spirit: 5,
      agility: 6,
      insight: 7,
    });
    expect(snapshot.derivedDynamicOffset.movementRange).toBe(4);
    expect(snapshot.derivedAttributes.movementRange).toBe(10);
  });

  it("rejects missing definitions, duplicate instances, and wrong targets", () => {
    const instance = applyStatus(createInstance(), FOCUS).instance;

    expect(() => createStatusAttributeModifiers([instance], {})).toThrow(
      "Missing status definition",
    );
    expect(() =>
      createStatusAttributeModifiers([instance, instance], { [FOCUS.definitionId]: FOCUS }),
    ).toThrow("Duplicate status instance id");

    const character = {
      playerId: PLAYER_ID,
    } as CharacterState;

    expect(() =>
      createCharacterAttributeSnapshotWithStatuses(
        character,
        {},
        [{ ...instance, targetId: "another-player" }],
        { [FOCUS.definitionId]: FOCUS },
      ),
    ).toThrow("does not belong to character");
  });
});
