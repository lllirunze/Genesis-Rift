import {
  FORCED_DISPLACEMENT_BOUNDARY_BEHAVIORS,
  FORCED_DISPLACEMENT_ELEVATION_RULES,
  FORCED_DISPLACEMENT_MODES,
  FORCED_DISPLACEMENT_OBSTRUCTION_BEHAVIORS,
} from "./forced-displacement-config.ts";

/** 描述强制位移采用路径型移动或目标传送。 */
export type ForcedDisplacementMode = (typeof FORCED_DISPLACEMENT_MODES)[number];

/** 描述强制位移遇到地图边界时的处理方式。 */
export type ForcedDisplacementBoundaryBehavior =
  (typeof FORCED_DISPLACEMENT_BOUNDARY_BEHAVIORS)[number];

/** 描述强制位移遇到阻挡时的停止、失败或忽略规则。 */
export type ForcedDisplacementObstructionBehavior =
  (typeof FORCED_DISPLACEMENT_OBSTRUCTION_BEHAVIORS)[number];

/** 描述强制位移是否受到普通移动高度差约束。 */
export type ForcedDisplacementElevationRule = (typeof FORCED_DISPLACEMENT_ELEVATION_RULES)[number];

/** 描述一种强制位移效果不随运行过程改变的静态规则。 */
export interface ForcedDisplacementDefinition<
  Parameters extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> {
  readonly definitionId: string;
  readonly name: string;
  readonly typeId: string;
  readonly plannerId: string;
  readonly mode: ForcedDisplacementMode;
  readonly boundaryBehavior: ForcedDisplacementBoundaryBehavior;
  readonly obstructionBehavior: ForcedDisplacementObstructionBehavior;
  readonly elevationRule: ForcedDisplacementElevationRule;
  readonly recordsExploration: boolean;
  readonly triggersArrivalEffects: boolean;
  readonly endsActiveMovement: boolean;
  readonly parameters: Parameters;
}

/**
 * 方法名：validateForcedDisplacementDefinition
 * 作用：校验强制位移定义中的标识、模式和行为规则。
 * @param definition 需要校验的强制位移静态定义。
 * @returns 无返回值。
 * @throws 标识或枚举配置非法时抛出错误。
 */
export function validateForcedDisplacementDefinition(
  definition: ForcedDisplacementDefinition,
): void {
  assertNonEmptyString(definition.definitionId, "definitionId");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.typeId, "typeId");
  assertNonEmptyString(definition.plannerId, "plannerId");

  if (!FORCED_DISPLACEMENT_MODES.includes(definition.mode)) {
    throw new RangeError(`Unsupported forced displacement mode: ${definition.mode}`);
  }

  if (!FORCED_DISPLACEMENT_BOUNDARY_BEHAVIORS.includes(definition.boundaryBehavior)) {
    throw new RangeError(
      `Unsupported forced displacement boundary behavior: ${definition.boundaryBehavior}`,
    );
  }

  if (!FORCED_DISPLACEMENT_OBSTRUCTION_BEHAVIORS.includes(definition.obstructionBehavior)) {
    throw new RangeError(
      `Unsupported forced displacement obstruction behavior: ${definition.obstructionBehavior}`,
    );
  }

  if (!FORCED_DISPLACEMENT_ELEVATION_RULES.includes(definition.elevationRule)) {
    throw new RangeError(
      `Unsupported forced displacement elevation rule: ${definition.elevationRule}`,
    );
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验强制位移配置字符串包含有效内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
