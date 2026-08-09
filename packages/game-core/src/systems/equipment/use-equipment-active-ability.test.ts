import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import type { EquipmentDefinitionCatalog } from "./equipment-attribute-modifiers.ts";
import { EquipmentActiveEffectHandlerRegistry } from "./equipment-active-effect-handler.ts";
import {
  advanceEquipmentActiveAbilityStateAtTurnEnd,
  createEquipmentActiveAbilityState,
  synchronizeEquipmentActiveAbilityState,
} from "./equipment-active-ability-runtime.ts";
import { createEquipmentInstance } from "./equipment-instance.ts";
import {
  createEmptyEquipmentLoadout,
  equipEquipment,
  unequipEquipment,
} from "./equipment-loadout.ts";
import { useEquipmentActiveAbility } from "./use-equipment-active-ability.ts";

const PLAYER_ID = "player-equipment" as PlayerId;

const DEFINITIONS = {
  equip_000101: {
    definitionId: "equip_000101",
    name: "testShield",
    type: "armor",
    quality: "common",
    corePosition: "body",
    allowDuplicateEquipping: false,
    weaponAttack: 0,
    attributeEffects: [],
    activeAbility: {
      abilityId: "testShield.fortify",
      description: "Gain a test shield.",
      targetType: "self",
      range: 0,
      cooldownTurns: 2,
      maxUsesPerTurn: 1,
      conditionIds: [],
      effects: [{ effectId: "shield", effectType: "shield_grant", parameters: { amount: 6 } }],
    },
  },
} as const satisfies EquipmentDefinitionCatalog;

describe("useEquipmentActiveAbility", () => {
  it("commits cooldown and delegates the configured effect for an equipped instance", () => {
    const equipment = createEquipmentInstance({
      instanceId: "equipment-instance-001",
      definitionId: "equip_000101",
      ownerPlayerId: PLAYER_ID,
    });
    const loadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "armor",
      equipment,
      DEFINITIONS.equip_000101,
    ).loadout;
    const registry = new EquipmentActiveEffectHandlerRegistry().register({
      effectType: "shield_grant",
      execute(effect) {
        return {
          effectId: effect.effectId,
          outcome: "applied",
          output: effect.parameters.amount,
        };
      },
    });
    const state = createEquipmentActiveAbilityState(loadout, DEFINITIONS);

    const result = useEquipmentActiveAbility(
      state,
      loadout,
      equipment.instanceId,
      { conditionsSatisfied: true, targetIsValid: true, targetIsInRange: true },
      {
        executionId: "equipment-use-001",
        ownerId: PLAYER_ID,
        equipmentInstanceId: equipment.instanceId,
        targetIds: [PLAYER_ID],
      },
      DEFINITIONS,
      registry,
    );

    expect(result.abilityState.entries[equipment.instanceId]).toMatchObject({
      remainingCooldownTurns: 2,
      usesThisTurn: 1,
      totalUses: 1,
    });
    expect(result.effectResults).toEqual([{ effectId: "shield", outcome: "applied", output: 6 }]);
    expect(() =>
      useEquipmentActiveAbility(
        result.abilityState,
        loadout,
        equipment.instanceId,
        { conditionsSatisfied: true, targetIsValid: true, targetIsInRange: true },
        {
          executionId: "equipment-use-002",
          ownerId: PLAYER_ID,
          equipmentInstanceId: equipment.instanceId,
          targetIds: [PLAYER_ID],
        },
        DEFINITIONS,
        registry,
      ),
    ).toThrow("ON_COOLDOWN");
    expect(
      advanceEquipmentActiveAbilityStateAtTurnEnd(
        advanceEquipmentActiveAbilityStateAtTurnEnd(result.abilityState),
      ).entries[equipment.instanceId],
    ).toMatchObject({ remainingCooldownTurns: 0, usesThisTurn: 0, totalUses: 1 });
  });

  it("removes the runtime entry when the active equipment is unequipped", () => {
    const equipment = createEquipmentInstance({
      instanceId: "equipment-instance-001",
      definitionId: "equip_000101",
      ownerPlayerId: PLAYER_ID,
    });
    const equippedLoadout = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "armor",
      equipment,
      DEFINITIONS.equip_000101,
    ).loadout;
    const state = createEquipmentActiveAbilityState(equippedLoadout, DEFINITIONS);
    const unequippedLoadout = unequipEquipment(equippedLoadout, "armor").loadout;

    expect(
      synchronizeEquipmentActiveAbilityState(state, unequippedLoadout, DEFINITIONS).entries,
    ).toEqual({});
  });
});
