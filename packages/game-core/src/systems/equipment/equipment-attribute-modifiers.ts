import type { DerivedAttributeFormulaConfig } from "@genesis-rift/shared";

import type {
  AggregatedAttributeModifiers,
  AttributeModifier,
  CharacterAttributeSnapshot,
} from "../attribute/index.ts";
import {
  aggregateAttributeModifiers,
  createCharacterAttributeSnapshot,
} from "../attribute/index.ts";
import type { CharacterState } from "../character/index.ts";
import type { EquipmentDefinition } from "./equipment-definition.ts";
import { validateEquipmentDefinition } from "./equipment-definition.ts";
import { getEquippedEquipment, type EquipmentLoadout } from "./equipment-loadout.ts";

export type EquipmentDefinitionCatalog = Readonly<Record<string, EquipmentDefinition>>;

export function createEquipmentAttributeModifiers(
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): readonly AttributeModifier[] {
  const modifiers: AttributeModifier[] = [];

  for (const equipment of getEquippedEquipment(loadout)) {
    const definition = definitions[equipment.definitionId];

    if (definition === undefined) {
      throw new Error(`Missing equipment definition: ${equipment.definitionId}`);
    }

    validateEquipmentDefinition(definition);

    for (const effect of definition.attributeEffects) {
      const base = {
        modifierId: `equipment.${equipment.instanceId}.${effect.effectId}`,
        sourceId: equipment.instanceId,
        sourceType: "equipment",
        value: effect.value,
      };

      if (effect.targetType === "primary") {
        modifiers.push({
          ...base,
          targetType: "primary",
          targetAttribute: effect.targetAttribute,
        });
      } else {
        modifiers.push({
          ...base,
          targetType: "derived",
          targetAttribute: effect.targetAttribute,
        });
      }
    }
  }

  return modifiers;
}

export function aggregateEquipmentAttributeModifiers(
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): AggregatedAttributeModifiers {
  return aggregateAttributeModifiers(createEquipmentAttributeModifiers(loadout, definitions));
}

export function createCharacterAttributeSnapshotWithEquipment<DerivedAttribute extends string>(
  character: CharacterState,
  configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>,
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): CharacterAttributeSnapshot<DerivedAttribute> {
  if (character.playerId !== loadout.playerId) {
    throw new Error("Character and equipment loadout must belong to the same player");
  }

  return createCharacterAttributeSnapshot(
    character,
    configs,
    createEquipmentAttributeModifiers(loadout, definitions),
  );
}
