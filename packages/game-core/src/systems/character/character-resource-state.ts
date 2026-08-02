import type {
  CharacterResourceDefinition,
  CharacterResourceDefinitionCatalog,
  PlayerId,
} from "@genesis-rift/shared";

/** 描述当前模块对外公开的业务数据契约。 */
export interface CharacterResourceValue {
  readonly current: number;
  readonly minimum: number;
  readonly maximum: number;
}

/** 描述业务对象在运行时保存的状态。 */
export interface CharacterResourceState<ResourceId extends string = string> {
  readonly playerId: PlayerId;
  readonly resources: Readonly<Record<ResourceId, CharacterResourceValue>>;
}

/**
 * 方法名：createCharacterResourceState
 * 作用：创建并校验该方法所负责的业务对象。
 * @param playerId 目标玩家标识。
 * @param definitions 方法所需的 definitions 参数。
 * @param derivedAttributes 方法所需的 derivedAttributes 参数。
 * @returns 本次处理得到的结果。
 */
export function createCharacterResourceState<
  ResourceId extends string,
  DerivedAttribute extends string,
>(
  playerId: PlayerId,
  definitions: CharacterResourceDefinitionCatalog<ResourceId, DerivedAttribute>,
  derivedAttributes: Readonly<Record<DerivedAttribute, number>>,
): CharacterResourceState<ResourceId> {
  validateCharacterResourceDefinitions(definitions);
  const resources = {} as Record<ResourceId, CharacterResourceValue>;

  for (const resourceId of Object.keys(definitions) as ResourceId[]) {
    const definition = definitions[resourceId];
    const maximum = getMaximumValue(definition, derivedAttributes);

    resources[resourceId] = {
      current: getInitialValue(definition, maximum),
      minimum: definition.minimum,
      maximum,
    };
  }

  return { playerId, resources };
}

/**
 * 方法名：synchronizeCharacterResourceMaximums
 * 作用：执行该方法负责的单一业务操作。
 * @param state 当前业务状态。
 * @param definitions 方法所需的 definitions 参数。
 * @param derivedAttributes 方法所需的 derivedAttributes 参数。
 * @returns 本次处理得到的结果。
 */
export function synchronizeCharacterResourceMaximums<
  ResourceId extends string,
  DerivedAttribute extends string,
>(
  state: CharacterResourceState<ResourceId>,
  definitions: CharacterResourceDefinitionCatalog<ResourceId, DerivedAttribute>,
  derivedAttributes: Readonly<Record<DerivedAttribute, number>>,
): CharacterResourceState<ResourceId> {
  validateCharacterResourceDefinitions(definitions);
  validateCharacterResourceState(state, definitions);
  const resources = {} as Record<ResourceId, CharacterResourceValue>;

  for (const resourceId of Object.keys(definitions) as ResourceId[]) {
    const definition = definitions[resourceId];
    const previous = getCharacterResource(state, resourceId);
    const maximum = getMaximumValue(definition, derivedAttributes);

    resources[resourceId] = {
      current: clamp(previous.current, definition.minimum, maximum),
      minimum: definition.minimum,
      maximum,
    };
  }

  return { ...state, resources };
}

/**
 * 方法名：getCharacterResource
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param state 当前业务状态。
 * @param resourceId 方法所需的 resourceId 参数。
 * @returns 本次处理得到的结果。
 */
export function getCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
): CharacterResourceValue {
  const resource = state.resources[resourceId];

  if (resource === undefined) {
    throw new Error(`Character resource not found: ${resourceId}`);
  }

  return resource;
}

/**
 * 方法名：validateCharacterResourceDefinitions
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateCharacterResourceDefinitions<
  ResourceId extends string,
  DerivedAttribute extends string,
>(definitions: CharacterResourceDefinitionCatalog<ResourceId, DerivedAttribute>): void {
  for (const [resourceId, definition] of Object.entries(definitions) as [
    ResourceId,
    CharacterResourceDefinition<ResourceId, DerivedAttribute>,
  ][]) {
    assertNonEmptyString(resourceId, "resourceId");
    assertNonEmptyString(definition.resourceId, "definition.resourceId");
    assertNonEmptyString(definition.maximumDerivedAttribute, "maximumDerivedAttribute");
    assertNonNegativeSafeInteger(definition.minimum, `${resourceId}.minimum`);

    if (resourceId !== definition.resourceId) {
      throw new Error(`Character resource catalog key does not match resourceId: ${resourceId}`);
    }

    if (
      definition.initialValue.kind !== "maximum" &&
      definition.initialValue.kind !== "minimum" &&
      definition.initialValue.kind !== "fixed"
    ) {
      throw new RangeError(`Unsupported initial value policy: ${resourceId}`);
    }

    if (definition.initialValue.kind === "fixed") {
      assertSafeInteger(definition.initialValue.value, `${resourceId}.initialValue.value`);
    }
  }
}

/**
 * 方法名：validateCharacterResourceState
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param state 当前业务状态。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateCharacterResourceState<
  ResourceId extends string,
  DerivedAttribute extends string,
>(
  state: CharacterResourceState<ResourceId>,
  definitions: CharacterResourceDefinitionCatalog<ResourceId, DerivedAttribute>,
): void {
  const definitionIds = Object.keys(definitions);
  const stateIds = Object.keys(state.resources);

  if (
    definitionIds.length !== stateIds.length ||
    stateIds.some((resourceId) => !(resourceId in definitions))
  ) {
    throw new Error("Character resource state does not match its definition catalog");
  }

  for (const resourceId of definitionIds as ResourceId[]) {
    const resource = getCharacterResource(state, resourceId);

    assertNonNegativeSafeInteger(resource.minimum, `${resourceId}.minimum`);
    assertSafeInteger(resource.maximum, `${resourceId}.maximum`);
    assertSafeInteger(resource.current, `${resourceId}.current`);

    if (resource.maximum < resource.minimum) {
      throw new RangeError(`${resourceId}.maximum must not be lower than minimum`);
    }

    if (resource.current < resource.minimum || resource.current > resource.maximum) {
      throw new RangeError(`${resourceId}.current must stay within its resource boundaries`);
    }
  }
}

/**
 * 方法名：getMaximumValue
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param definition 方法所需的 definition 参数。
 * @param derivedAttributes 方法所需的 derivedAttributes 参数。
 * @returns 本次处理得到的结果。
 */
function getMaximumValue<DerivedAttribute extends string>(
  definition: CharacterResourceDefinition<string, DerivedAttribute>,
  derivedAttributes: Readonly<Record<DerivedAttribute, number>>,
): number {
  const maximum = derivedAttributes[definition.maximumDerivedAttribute];

  if (maximum === undefined) {
    throw new Error(`Missing maximum derived attribute: ${definition.maximumDerivedAttribute}`);
  }

  assertSafeInteger(maximum, `${definition.resourceId}.maximum`);

  if (maximum < definition.minimum) {
    throw new RangeError(`${definition.resourceId}.maximum must not be lower than minimum`);
  }

  return maximum;
}

/**
 * 方法名：getInitialValue
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param definition 方法所需的 definition 参数。
 * @param maximum 方法所需的 maximum 参数。
 * @returns 本次处理得到的结果。
 */
function getInitialValue(definition: CharacterResourceDefinition, maximum: number): number {
  if (definition.initialValue.kind === "maximum") {
    return maximum;
  }

  if (definition.initialValue.kind === "minimum") {
    return definition.minimum;
  }

  const value = definition.initialValue.value;

  if (value < definition.minimum || value > maximum) {
    throw new RangeError(`${definition.resourceId}.initialValue must stay within its boundaries`);
  }

  return value;
}

/**
 * 方法名：clamp
 * 作用：执行该方法负责的单一业务操作。
 * @param value 待处理的值。
 * @param minimum 方法所需的 minimum 参数。
 * @param maximum 方法所需的 maximum 参数。
 * @returns 本次处理得到的结果。
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  assertSafeInteger(value, field);

  if (value < 0) {
    throw new RangeError(`${field} must not be negative`);
  }
}

/**
 * 方法名：assertSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
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
