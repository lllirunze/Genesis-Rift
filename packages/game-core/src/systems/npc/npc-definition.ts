import { assertResourceId } from "@genesis-rift/shared";

import { NPC_SERVICE_TYPES } from "./npc-config.ts";

/** 描述 NPC 可提供的业务服务类型。 */
export type NpcServiceType = (typeof NPC_SERVICE_TYPES)[number];

/** 描述 NPC 一项静态服务的类型和前置条件。 */
export interface NpcServiceDefinition {
  readonly serviceType: NpcServiceType;
  readonly requiredConditionIds: readonly string[];
  readonly shopDefinitionId?: string;
}

/** 描述不随运行过程改变的 NPC 静态定义。 */
export interface NpcDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly services: readonly NpcServiceDefinition[];
}

/** 描述以 NPC 资源标识索引的只读 NPC 定义注册表。 */
export type NpcDefinitionCatalog = Readonly<Record<string, NpcDefinition>>;

/**
 * 方法名：validateNpcDefinition
 * 作用：校验 NPC 资源标识、显示名称与服务配置均符合统一规范。
 * @param definition 需要校验的 NPC 静态定义。
 * @returns 无返回值。
 * @throws NPC 标识、服务类型或服务条件不合法时抛出错误。
 */
export function validateNpcDefinition(definition: NpcDefinition): void {
  assertResourceId(definition.definitionId, "npc");
  assertNonEmptyString(definition.name, "name");
  const serviceTypes = new Set<NpcServiceType>();

  for (const service of definition.services) {
    if (!NPC_SERVICE_TYPES.includes(service.serviceType)) {
      throw new RangeError(`Unsupported NPC service type: ${service.serviceType}`);
    }

    if (serviceTypes.has(service.serviceType)) {
      throw new Error(`Duplicate NPC service type: ${service.serviceType}`);
    }

    serviceTypes.add(service.serviceType);
    validateConditionIds(service.requiredConditionIds);
    validateServiceReferences(service);
  }
}

/**
 * 方法名：validateNpcDefinitionCatalog
 * 作用：校验 NPC 注册表索引与其静态定义标识保持一致。
 * @param catalog 需要校验的 NPC 定义注册表。
 * @returns 无返回值。
 * @throws 注册表索引与 NPC 定义标识不一致时抛出错误。
 */
export function validateNpcDefinitionCatalog(catalog: NpcDefinitionCatalog): void {
  for (const [definitionId, definition] of Object.entries(catalog)) {
    if (definitionId !== definition.definitionId) {
      throw new Error(`NPC catalog key does not match definition id: ${definitionId}`);
    }

    validateNpcDefinition(definition);
  }
}

/**
 * 方法名：getNpcServiceDefinition
 * 作用：读取 NPC 声明提供的指定服务定义。
 * @param definition NPC 静态定义。
 * @param serviceType 需要读取的服务类型。
 * @returns 对应服务定义；NPC 未提供时返回 null。
 */
export function getNpcServiceDefinition(
  definition: NpcDefinition,
  serviceType: NpcServiceType,
): NpcServiceDefinition | null {
  return definition.services.find((service) => service.serviceType === serviceType) ?? null;
}

/**
 * 方法名：validateConditionIds
 * 作用：校验 NPC 服务条件均为不重复的条件资源标识。
 * @param conditionIds 需要校验的服务条件标识。
 * @returns 无返回值。
 * @throws 条件标识重复或不符合资源 ID 规范时抛出错误。
 */
function validateConditionIds(conditionIds: readonly string[]): void {
  const ids = new Set<string>();

  for (const conditionId of conditionIds) {
    assertResourceId(conditionId, "condition");

    if (ids.has(conditionId)) {
      throw new Error(`Duplicate NPC service condition: ${conditionId}`);
    }

    ids.add(conditionId);
  }
}

/**
 * 方法名：validateServiceReferences
 * 作用：校验商店服务必须引用商店定义，其他服务不得携带商店引用。
 * @param service 需要校验的 NPC 服务定义。
 * @returns 无返回值。
 * @throws 服务类型与商店定义引用不匹配时抛出错误。
 */
function validateServiceReferences(service: NpcServiceDefinition): void {
  if (service.serviceType === "shop") {
    if (service.shopDefinitionId === undefined) {
      throw new Error("NPC shop service requires shopDefinitionId");
    }

    assertResourceId(service.shopDefinitionId, "shop");
    return;
  }

  if (service.shopDefinitionId !== undefined) {
    throw new Error("Only NPC shop services may define shopDefinitionId");
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入为包含有效内容的字符串。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空白时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
