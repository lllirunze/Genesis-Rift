import { describe, expect, it } from "vitest";

import {
  advanceCharacterStatusesAtTurnEnd,
  applyStatusToCharacter,
  createCharacterStatusState,
  dispelCharacterStatus,
  getCharacterStatusByInstanceId,
  getCharacterStatusesByKind,
  getCharacterStatusesByTag,
  removeCharacterStatusesOnDeath,
  removeCharacterStatusStacks,
  validateCharacterStatusState,
  type CharacterStatusState,
} from "./character-status-state.ts";
import { type StatusDefinition, type StatusDefinitionCatalog } from "./status-definition.ts";
import { PERMANENT_STATUS_DURATION_TURNS } from "./status-config.ts";

const FOCUS: StatusDefinition = {
  definitionId: "buff_000101",
  name: "Focus",
  description: "Improves insight for a short duration.",
  kind: "buff",
  tags: ["mental"],
  duration: { turns: 2 },
  maxStacks: 2,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [],
};

const EXHAUSTION: StatusDefinition = {
  definitionId: "debuff_000001",
  name: "Exhaustion",
  description: "Reduces movement for a short duration.",
  kind: "debuff",
  tags: ["physical", "movement"],
  duration: { turns: 3 },
  maxStacks: 1,
  removal: {
    dispellable: true,
    removeOnDeath: true,
  },
  effects: [],
};

const SOUL_PACT: StatusDefinition = {
  definitionId: "buff_000103",
  name: "Soul Pact",
  description: "A permanent pact that remains after death.",
  kind: "buff",
  tags: ["contract", "long-lived"],
  duration: { turns: PERMANENT_STATUS_DURATION_TURNS },
  maxStacks: 1,
  removal: {
    dispellable: false,
    removeOnDeath: false,
  },
  effects: [],
};

const DEFINITIONS = {
  [FOCUS.definitionId]: FOCUS,
  [EXHAUSTION.definitionId]: EXHAUSTION,
  [SOUL_PACT.definitionId]: SOUL_PACT,
} as const satisfies StatusDefinitionCatalog;

/**
 * 方法名：applyDefinition
 * 作用：执行该方法负责的业务规则并返回结算结果。
 * @param state 当前业务状态。
 * @param definition 方法所需的 definition 参数。
 * @param sequence 方法所需的 sequence 参数。
 * @returns 本次处理得到的结果。
 */
function applyDefinition(
  state: CharacterStatusState,
  definition: StatusDefinition,
  sequence: number,
) {
  return applyStatusToCharacter(state, DEFINITIONS, {
    definitionId: definition.definitionId,
    newInstanceId: `instance-${definition.definitionId}`,
    sourceId: "character-source",
    createdAtSequence: sequence,
  });
}

describe("character status state", () => {
  it("creates an empty collection for one target", () => {
    expect(createCharacterStatusState("character-target")).toEqual({
      targetId: "character-target",
      instances: [],
    });
  });

  it("creates, stacks, and refreshes one definition without duplicating it", () => {
    const initial = createCharacterStatusState("character-target");
    const first = applyDefinition(initial, FOCUS, 1);
    const second = applyDefinition(
      {
        ...first.state,
        instances: [{ ...first.instance, remainingTurns: 1 }],
      },
      FOCUS,
      2,
    );
    const capped = applyDefinition(second.state, FOCUS, 3);

    expect(first.outcome).toBe("applied");
    expect(first.created).toBe(true);
    expect(second.outcome).toBe("stacked");
    expect(second.created).toBe(false);
    expect(second.instance.currentStacks).toBe(2);
    expect(second.instance.remainingTurns).toBe(2);
    expect(capped.outcome).toBe("refreshed");
    expect(capped.state.instances).toHaveLength(1);
  });

  it("advances every active status once and removes expired statuses", () => {
    const initial = createCharacterStatusState("character-target");
    const focus = applyDefinition(initial, FOCUS, 1).state;
    const withExhaustion = applyDefinition(focus, EXHAUSTION, 2).state;
    const firstTurn = advanceCharacterStatusesAtTurnEnd(withExhaustion, DEFINITIONS);
    const secondTurn = advanceCharacterStatusesAtTurnEnd(firstTurn.state, DEFINITIONS);

    expect(firstTurn.ticked.map((instance) => instance.remainingTurns)).toEqual([1, 2]);
    expect(firstTurn.expired).toEqual([]);
    expect(secondTurn.expired.map((instance) => instance.definitionId)).toEqual([
      FOCUS.definitionId,
    ]);
    expect(secondTurn.state.instances[0]?.remainingTurns).toBe(1);
  });

  it("reduces stacks explicitly and removes the status at zero stacks", () => {
    const initial = createCharacterStatusState("character-target");
    const first = applyDefinition(initial, FOCUS, 1);
    const stacked = applyDefinition(first.state, FOCUS, 2);
    const reduced = removeCharacterStatusStacks(
      stacked.state,
      DEFINITIONS,
      stacked.instance.instanceId,
      1,
    );
    const removed = removeCharacterStatusStacks(
      reduced.state,
      DEFINITIONS,
      stacked.instance.instanceId,
      1,
    );

    expect(reduced.outcome).toBe("reduced");
    expect(reduced.instance?.currentStacks).toBe(1);
    expect(removed.outcome).toBe("removed");
    expect(removed.state.instances).toEqual([]);
  });

  it("dispels removable statuses and protects non-dispellable statuses", () => {
    const initial = createCharacterStatusState("character-target");
    const focus = applyDefinition(initial, FOCUS, 1);
    const pact = applyDefinition(focus.state, SOUL_PACT, 2);
    const protectedResult = dispelCharacterStatus(
      pact.state,
      DEFINITIONS,
      pact.instance.instanceId,
    );
    const dispelled = dispelCharacterStatus(
      protectedResult.state,
      DEFINITIONS,
      focus.instance.instanceId,
    );

    expect(protectedResult.outcome).toBe("protected");
    expect(dispelled.outcome).toBe("dispelled");
    expect(dispelled.state.instances).toEqual([pact.instance]);
  });

  it("removes temporary statuses on death and retains permanent statuses", () => {
    const initial = createCharacterStatusState("character-target");
    const focus = applyDefinition(initial, FOCUS, 1);
    const pact = applyDefinition(focus.state, SOUL_PACT, 2);
    const result = removeCharacterStatusesOnDeath(pact.state, DEFINITIONS);

    expect(result.removed).toEqual([focus.instance]);
    expect(result.retained).toEqual([pact.instance]);
    expect(result.state.instances).toEqual([pact.instance]);
  });

  it("queries statuses by instance id, kind, and tag", () => {
    const initial = createCharacterStatusState("character-target");
    const focus = applyDefinition(initial, FOCUS, 1);
    const exhaustion = applyDefinition(focus.state, EXHAUSTION, 2);

    expect(getCharacterStatusByInstanceId(exhaustion.state, focus.instance.instanceId)).toBe(
      focus.instance,
    );
    expect(getCharacterStatusesByKind(exhaustion.state, DEFINITIONS, "debuff")).toEqual([
      exhaustion.instance,
    ]);
    expect(getCharacterStatusesByTag(exhaustion.state, DEFINITIONS, "mental")).toEqual([
      focus.instance,
    ]);
  });

  it("rejects inactive, duplicated, and incorrectly targeted collection entries", () => {
    const initial = createCharacterStatusState("character-target");
    const focus = applyDefinition(initial, FOCUS, 1);

    expect(() =>
      validateCharacterStatusState(
        { ...focus.state, instances: [{ ...focus.instance, currentStacks: 0 }] },
        DEFINITIONS,
      ),
    ).toThrow("inactive instance");
    expect(() =>
      validateCharacterStatusState(
        { ...focus.state, instances: [focus.instance, focus.instance] },
        DEFINITIONS,
      ),
    ).toThrow("Duplicate status instance id");
    expect(() =>
      validateCharacterStatusState(
        { ...focus.state, instances: [{ ...focus.instance, targetId: "other-target" }] },
        DEFINITIONS,
      ),
    ).toThrow("does not belong to target");
  });
});
