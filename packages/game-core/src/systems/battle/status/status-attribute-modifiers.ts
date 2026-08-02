import type { DerivedAttributeFormulaConfig } from "@genesis-rift/shared";

import type {
  AggregatedAttributeModifiers,
  AttributeModifier,
  CharacterAttributeSnapshot,
} from "../../attribute/index.ts";
import {
  aggregateAttributeModifiers,
  createCharacterAttributeSnapshot,
} from "../../attribute/index.ts";
import type { CharacterState } from "../../character/index.ts";
import type { StatusDefinitionCatalog } from "./status-definition.ts";
import { validateStatusDefinition } from "./status-definition.ts";
import type { StatusInstance } from "./status-instance.ts";
import { validateStatusInstance } from "./status-instance.ts";

/**
 * 方法名：createStatusAttributeModifiers
 * 作用：创建并校验该方法所负责的业务对象。
 * @param instances 方法所需的 instances 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function createStatusAttributeModifiers(
  instances: readonly StatusInstance[],
  definitions: StatusDefinitionCatalog,
): readonly AttributeModifier[] {
  const modifiers: AttributeModifier[] = [];
  const instanceIds = new Set<string>();

  for (const instance of instances) {
    if (instanceIds.has(instance.instanceId)) {
      throw new Error(`Duplicate status instance id: ${instance.instanceId}`);
    }

    instanceIds.add(instance.instanceId);
    const definition = definitions[instance.definitionId];

    if (definition === undefined) {
      throw new Error(`Missing status definition: ${instance.definitionId}`);
    }

    validateStatusDefinition(definition);
    validateStatusInstance(instance, definition);

    if (instance.currentStacks === 0 || instance.remainingTurns === 0) {
      continue;
    }

    for (const effect of definition.effects) {
      const value = effect.valuePerStack * instance.currentStacks;

      if (!Number.isSafeInteger(value)) {
        throw new RangeError(
          `Status effect value exceeds the safe integer range: ${effect.effectId}`,
        );
      }

      const base = {
        modifierId: `status.${instance.instanceId}.${effect.effectId}`,
        sourceId: instance.instanceId,
        sourceType: "status",
        value,
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
 * 方法名：aggregateStatusAttributeModifiers
 * 作用：根据输入执行确定性计算并返回结果。
 * @param instances 方法所需的 instances 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function aggregateStatusAttributeModifiers(
  instances: readonly StatusInstance[],
  definitions: StatusDefinitionCatalog,
): AggregatedAttributeModifiers {
  return aggregateAttributeModifiers(createStatusAttributeModifiers(instances, definitions));
}

/**
 * 方法名：createCharacterAttributeSnapshotWithStatuses
 * 作用：创建并校验该方法所负责的业务对象。
 * @param character 方法所需的 character 参数。
 * @param configs 方法所需的 configs 参数。
 * @param instances 方法所需的 instances 参数。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function createCharacterAttributeSnapshotWithStatuses<DerivedAttribute extends string>(
  character: CharacterState,
  configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>,
  instances: readonly StatusInstance[],
  definitions: StatusDefinitionCatalog,
): CharacterAttributeSnapshot<DerivedAttribute> {
  for (const instance of instances) {
    if (instance.targetId !== character.playerId) {
      throw new Error(`Status instance does not belong to character: ${instance.instanceId}`);
    }
  }

  return createCharacterAttributeSnapshot(
    character,
    configs,
    createStatusAttributeModifiers(instances, definitions),
  );
}
