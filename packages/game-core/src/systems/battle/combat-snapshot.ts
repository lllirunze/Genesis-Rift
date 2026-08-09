import type { DerivedAttributeFormulaConfig } from "@genesis-rift/shared";

import {
  createCharacterAttributeSnapshot,
  type AttributeModifier,
  type CharacterAttributeSnapshot,
} from "../attribute/index.ts";
import type { CharacterState } from "../character/index.ts";
import {
  createEquipmentAttributeModifiers,
  type EquipmentDefinitionCatalog,
  type EquipmentLoadout,
} from "../equipment/index.ts";

import {
  createStatusAttributeModifiers,
  type CharacterStatusState,
  type StatusDefinitionCatalog,
} from "./status/index.ts";

/** 描述装配角色战斗最终属性所需的跨系统输入。 */
export interface CreateCombatAttributeSnapshotInput<DerivedAttribute extends string> {
  readonly character: CharacterState;
  readonly equipment: EquipmentLoadout;
  readonly equipmentDefinitions: EquipmentDefinitionCatalog;
  readonly statuses: CharacterStatusState;
  readonly statusDefinitions: StatusDefinitionCatalog;
  readonly derivedAttributeConfigs: Readonly<
    Record<DerivedAttribute, DerivedAttributeFormulaConfig>
  >;
}

/** 描述战斗系统读取的最终属性及各来源修饰器。 */
export interface CombatAttributeSnapshot<DerivedAttribute extends string> {
  readonly attributes: CharacterAttributeSnapshot<DerivedAttribute>;
  readonly equipmentModifiers: readonly AttributeModifier[];
  readonly statusModifiers: readonly AttributeModifier[];
}

/**
 * 方法名：createCombatAttributeSnapshot
 * 作用：合并角色固有、装备和有效状态修饰器，生成战斗只读最终属性快照。
 * @param input 角色、装备、状态、定义注册表与派生属性公式。
 * @returns 可由攻击、技能和防守流程共同读取的不可变战斗属性快照。
 * @throws 角色、装备或状态归属不一致，或任一静态定义不合法时抛出错误。
 */
export function createCombatAttributeSnapshot<DerivedAttribute extends string>(
  input: CreateCombatAttributeSnapshotInput<DerivedAttribute>,
): CombatAttributeSnapshot<DerivedAttribute> {
  assertOwnership(input.character, input.equipment, input.statuses);
  const equipmentModifiers = createEquipmentAttributeModifiers(
    input.equipment,
    input.equipmentDefinitions,
  );
  const statusModifiers = createStatusAttributeModifiers(
    input.statuses.instances,
    input.statusDefinitions,
  );
  const attributes = createCharacterAttributeSnapshot(
    input.character,
    input.derivedAttributeConfigs,
    [...equipmentModifiers, ...statusModifiers],
  );

  return Object.freeze({
    attributes,
    equipmentModifiers: Object.freeze([...equipmentModifiers]),
    statusModifiers: Object.freeze([...statusModifiers]),
  });
}

/** 校验角色、装备栏和状态集合确实属于同一名玩家。 */
function assertOwnership(
  character: CharacterState,
  equipment: EquipmentLoadout,
  statuses: CharacterStatusState,
): void {
  if (character.playerId !== equipment.playerId) {
    throw new Error("Character and equipment loadout must belong to the same player");
  }

  if (character.playerId !== statuses.targetId) {
    throw new Error("Character and status state must belong to the same player");
  }
}
