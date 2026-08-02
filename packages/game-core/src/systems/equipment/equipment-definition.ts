import {
  isStandardQuality,
  type PrimaryAttribute,
  type StandardQuality,
} from "@genesis-rift/shared";

import { EQUIPMENT_TYPES } from "./equipment-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

interface EquipmentAttributeEffectBase {
  readonly effectId: string;
  readonly value: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface EquipmentPrimaryAttributeEffect extends EquipmentAttributeEffectBase {
  readonly targetType: "primary";
  readonly targetAttribute: PrimaryAttribute;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface EquipmentDerivedAttributeEffect extends EquipmentAttributeEffectBase {
  readonly targetType: "derived";
  readonly targetAttribute: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export type EquipmentAttributeEffect =
  EquipmentPrimaryAttributeEffect | EquipmentDerivedAttributeEffect;

/** 描述业务对象不随运行过程改变的静态定义。 */
export interface EquipmentDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly type: EquipmentType;
  readonly quality: StandardQuality;
  readonly corePosition: string;
  readonly allowDuplicateEquipping: boolean;
  readonly attributeEffects: readonly EquipmentAttributeEffect[];
}

/**
 * 方法名：validateEquipmentDefinition
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definition 方法所需的 definition 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateEquipmentDefinition(definition: EquipmentDefinition): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.corePosition, "corePosition");

  if (!EQUIPMENT_TYPES.includes(definition.type)) {
    throw new RangeError(`Unsupported equipment type: ${definition.type}`);
  }

  if (!isStandardQuality(definition.quality)) {
    throw new RangeError(`Unsupported equipment quality: ${definition.quality}`);
  }

  const effectIds = new Set<string>();

  for (const effect of definition.attributeEffects) {
    assertNonEmptyString(effect.effectId, "attributeEffects.effectId");

    if (effectIds.has(effect.effectId)) {
      throw new Error(`Duplicate equipment effect id: ${effect.effectId}`);
    }

    effectIds.add(effect.effectId);

    if (!Number.isInteger(effect.value)) {
      throw new TypeError(`Equipment effect ${effect.effectId} value must be an integer`);
    }

    if (effect.targetType === "derived") {
      assertNonEmptyString(effect.targetAttribute, `${effect.effectId}.targetAttribute`);
    }
  }
}

/**
 * 方法名：validateEquipmentDefinitions
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateEquipmentDefinitions(definitions: readonly EquipmentDefinition[]): void {
  const definitionIds = new Set<string>();
  const names = new Set<string>();

  for (const definition of definitions) {
    validateEquipmentDefinition(definition);

    if (definitionIds.has(definition.definitionId)) {
      throw new Error(`Duplicate equipment definition id: ${definition.definitionId}`);
    }

    if (names.has(definition.name)) {
      throw new Error(`Duplicate equipment name: ${definition.name}`);
    }

    definitionIds.add(definition.definitionId);
    names.add(definition.name);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
