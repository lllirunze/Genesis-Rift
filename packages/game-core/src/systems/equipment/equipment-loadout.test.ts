import type { PlayerId } from "@genesis-rift/shared";
import { describe, expect, it } from "vitest";

import type { EquipmentDefinition } from "./equipment-definition.ts";
import { createEquipmentInstance } from "./equipment-instance.ts";
import {
  createEmptyEquipmentLoadout,
  equipEquipment,
  getEquippedEquipment,
  unequipEquipment,
} from "./equipment-loadout.ts";

const PLAYER_ID = "player-1" as PlayerId;
const OTHER_PLAYER_ID = "player-2" as PlayerId;

const WEAPON: EquipmentDefinition = {
  definitionId: "equip_000101",
  name: "Training Sword",
  type: "weapon",
  quality: "common",
  corePosition: "A basic physical weapon.",
  allowDuplicateEquipping: false,
  attributeEffects: [],
};

const ACCESSORY: EquipmentDefinition = {
  ...WEAPON,
  definitionId: "equip_000103",
  name: "Lucky Charm",
  type: "accessory",
};

describe("equipment loadout", () => {
  it("equips, replaces and unequips without mutating the previous loadout", () => {
    const empty = createEmptyEquipmentLoadout(PLAYER_ID);
    const firstWeapon = createEquipmentInstance({
      instanceId: "instance.weapon-1",
      definitionId: WEAPON.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const secondWeapon = createEquipmentInstance({
      instanceId: "instance.weapon-2",
      definitionId: WEAPON.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const equipped = equipEquipment(empty, "weapon", firstWeapon, WEAPON);
    const replaced = equipEquipment(equipped.loadout, "weapon", secondWeapon, WEAPON);
    const unequipped = unequipEquipment(replaced.loadout, "weapon");

    expect(empty.slots.weapon).toBeNull();
    expect(equipped.loadout.slots.weapon).toBe(firstWeapon);
    expect(replaced.previousEquipment).toBe(firstWeapon);
    expect(unequipped.previousEquipment).toBe(secondWeapon);
    expect(unequipped.loadout.slots.weapon).toBeNull();
  });

  it("rejects wrong slots, foreign ownership and repeated instances", () => {
    const empty = createEmptyEquipmentLoadout(PLAYER_ID);
    const weapon = createEquipmentInstance({
      instanceId: "instance.weapon",
      definitionId: WEAPON.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const foreignWeapon = createEquipmentInstance({
      ...weapon,
      instanceId: "instance.foreign-weapon",
      ownerPlayerId: OTHER_PLAYER_ID,
    });

    expect(() => equipEquipment(empty, "armor", weapon, WEAPON)).toThrow("cannot be equipped");
    expect(() => equipEquipment(empty, "weapon", foreignWeapon, WEAPON)).toThrow(
      "owned by another player",
    );

    const corruptedLoadout = {
      ...empty,
      slots: { ...empty.slots, armor: weapon },
    };

    expect(() => equipEquipment(corruptedLoadout, "weapon", weapon, WEAPON)).toThrow(
      "already equipped",
    );
  });

  it("supports two accessory slots but rejects duplicate definitions by default", () => {
    const first = createEquipmentInstance({
      instanceId: "instance.accessory-1",
      definitionId: ACCESSORY.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const second = createEquipmentInstance({
      instanceId: "instance.accessory-2",
      definitionId: ACCESSORY.definitionId,
      ownerPlayerId: PLAYER_ID,
    });
    const equipped = equipEquipment(
      createEmptyEquipmentLoadout(PLAYER_ID),
      "accessory1",
      first,
      ACCESSORY,
    ).loadout;

    expect(() => equipEquipment(equipped, "accessory2", second, ACCESSORY)).toThrow(
      "Duplicate accessory",
    );

    const duplicateAllowed = { ...ACCESSORY, allowDuplicateEquipping: true };
    const completed = equipEquipment(equipped, "accessory2", second, duplicateAllowed).loadout;

    expect(getEquippedEquipment(completed)).toEqual([first, second]);
  });
});
