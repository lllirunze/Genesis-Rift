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

/** 描述以标识索引业务定义的只读注册表。 */
export type EquipmentDefinitionCatalog = Readonly<Record<string, EquipmentDefinition>>;

/**
 * 方法名：createEquipmentAttributeModifiers
 * 作用：创建并校验该方法所负责的业务对象。
 * @param loadout 方法所需的 loadout 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：getEquippedWeaponAttack
 * 作用：读取已穿戴武器的独立攻击力，武器攻击不并入角色派生属性。
 * @param loadout 当前角色装备栏。
 * @param definitions 装备静态定义注册表。
 * @returns 未装备武器时为零，否则返回武器定义的整数攻击力。
 * @throws 武器实例缺少定义或定义类型不匹配时抛出错误。
 */
export function getEquippedWeaponAttack(
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): number {
  const weapon = loadout.slots.weapon;

  if (weapon === null) {
    return 0;
  }

  const definition = definitions[weapon.definitionId];

  if (definition === undefined) {
    throw new Error(`Missing equipment definition: ${weapon.definitionId}`);
  }

  validateEquipmentDefinition(definition);

  if (definition.type !== "weapon") {
    throw new Error(`Weapon slot contains a non-weapon definition: ${definition.definitionId}`);
  }

  return definition.weaponAttack ?? 0;
}

/**
 * 方法名：aggregateEquipmentAttributeModifiers
 * 作用：根据输入执行确定性计算并返回结果。
 * @param loadout 方法所需的 loadout 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function aggregateEquipmentAttributeModifiers(
  loadout: EquipmentLoadout,
  definitions: EquipmentDefinitionCatalog,
): AggregatedAttributeModifiers {
  return aggregateAttributeModifiers(createEquipmentAttributeModifiers(loadout, definitions));
}

/**
 * 方法名：createCharacterAttributeSnapshotWithEquipment
 * 作用：创建并校验该方法所负责的业务对象。
 * @param character 方法所需的 character 参数。
 * @param configs 方法所需的 configs 参数。
 * @param loadout 方法所需的 loadout 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
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
