import type { TileId } from "@genesis-rift/shared";

import type { HexMap } from "../model/hex-map.ts";
import {
  SPECIAL_CONNECTION_DIRECTIONS,
  SPECIAL_CONNECTION_TRAVERSAL_MODES,
  SPECIAL_CONNECTION_VISIBILITIES,
} from "./special-connection-config.ts";

/** 描述特殊连接允许通过的方向模式。 */
export type SpecialConnectionDirection = (typeof SPECIAL_CONNECTION_DIRECTIONS)[number];

/** 描述特殊连接采用逐格路径还是直接传送。 */
export type SpecialConnectionTraversalMode = (typeof SPECIAL_CONNECTION_TRAVERSAL_MODES)[number];

/** 描述特殊连接默认公开或需要玩家发现。 */
export type SpecialConnectionVisibility = (typeof SPECIAL_CONNECTION_VISIBILITIES)[number];

/** 描述一条地图特殊连接不随运行过程改变的静态规则。 */
export interface SpecialConnectionDefinition {
  readonly connectionId: string;
  readonly name: string;
  readonly typeId: string;
  readonly sourceTileId: TileId;
  readonly targetTileId: TileId;
  readonly direction: SpecialConnectionDirection;
  readonly traversalMode: SpecialConnectionTraversalMode;
  readonly visibility: SpecialConnectionVisibility;
  readonly movementCost: number;
  readonly ignoresTargetPassability: boolean;
  readonly recordsExploration: boolean;
  readonly endsMovementOnFirstExploration: boolean;
  readonly triggersArrivalEffects: boolean;
  readonly conditionIds: readonly string[];
}

/** 描述以连接标识索引的只读特殊连接配置注册表。 */
export type SpecialConnectionDefinitionCatalog = Readonly<
  Record<string, SpecialConnectionDefinition>
>;

/**
 * 方法名：validateSpecialConnectionDefinition
 * 作用：校验特殊连接静态配置及其地图端点是否合法。
 * @param definition 需要校验的特殊连接定义。
 * @param map 特殊连接所属的六边形地图。
 * @returns 无返回值。
 * @throws 字段、端点、枚举、成本或条件配置非法时抛出错误。
 */
export function validateSpecialConnectionDefinition(
  definition: SpecialConnectionDefinition,
  map: HexMap,
): void {
  assertNonEmptyString(definition.connectionId, "connectionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.typeId, "typeId");

  if (map.getTileById(definition.sourceTileId) === undefined) {
    throw new Error(`Special connection source tile does not exist: ${definition.sourceTileId}`);
  }

  if (map.getTileById(definition.targetTileId) === undefined) {
    throw new Error(`Special connection target tile does not exist: ${definition.targetTileId}`);
  }

  if (definition.sourceTileId === definition.targetTileId) {
    throw new Error("Special connection endpoints must be different tiles");
  }

  if (!SPECIAL_CONNECTION_DIRECTIONS.includes(definition.direction)) {
    throw new RangeError(`Unsupported special connection direction: ${definition.direction}`);
  }

  if (!SPECIAL_CONNECTION_TRAVERSAL_MODES.includes(definition.traversalMode)) {
    throw new RangeError(
      `Unsupported special connection traversal mode: ${definition.traversalMode}`,
    );
  }

  if (!SPECIAL_CONNECTION_VISIBILITIES.includes(definition.visibility)) {
    throw new RangeError(`Unsupported special connection visibility: ${definition.visibility}`);
  }

  assertNonNegativeSafeInteger(definition.movementCost, "movementCost");
  assertUniqueNonEmptyStrings(definition.conditionIds, "conditionIds");
}

/**
 * 方法名：validateSpecialConnectionDefinitionCatalog
 * 作用：校验特殊连接注册表键值一致性及所有连接定义。
 * @param catalog 需要校验的特殊连接定义注册表。
 * @param map 特殊连接所属的六边形地图。
 * @returns 无返回值。
 * @throws 注册表键或任意连接定义非法时抛出错误。
 */
export function validateSpecialConnectionDefinitionCatalog(
  catalog: SpecialConnectionDefinitionCatalog,
  map: HexMap,
): void {
  for (const [connectionId, definition] of Object.entries(catalog)) {
    validateSpecialConnectionDefinition(definition, map);

    if (connectionId !== definition.connectionId) {
      throw new Error(
        `Special connection catalog key ${connectionId} does not match connection id ${definition.connectionId}`,
      );
    }
  }
}

/**
 * 方法名：assertUniqueNonEmptyStrings
 * 作用：校验字符串配置数组中的内容非空且不重复。
 * @param values 需要校验的字符串数组。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 */
function assertUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    uniqueValues.add(value);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验配置字符串包含有效内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验数值为非负安全整数。
 * @param value 需要校验的数值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
