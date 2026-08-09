import type { DayNightEnvironmentView } from "../../environment/day-night/day-night-runtime-state.ts";

/** 最终视野范围不允许低于一格，保证角色始终能够看见自身所在位置与相邻环境。 */
export const MINIMUM_EFFECTIVE_VISION_RANGE = 1;

/** 描述影响当前视野范围的一项可追踪修正。 */
export interface VisionRangeModifier {
  readonly sourceId: string;
  readonly kind: "environment" | "illumination";
  readonly offset: number;
}

/**
 * 方法名：createDayNightVisionModifier
 * 作用：将昼夜公开环境视图转换为地图视野可直接使用的环境修正。
 * @param environment 当前昼夜模块公开的阶段、标签和视野修正视图。
 * @returns 以昼夜阶段为来源的可追踪视野修正。
 */
export function createDayNightVisionModifier(
  environment: DayNightEnvironmentView,
): VisionRangeModifier {
  return Object.freeze({
    sourceId: `day-night.${environment.periodId}`,
    kind: "environment",
    offset: environment.visionModifier,
  });
}

/**
 * 方法名：createIlluminationVisionModifier
 * 作用：创建火把、灯光、篝火或其他照明来源提供的视野抵消修正。
 * @param sourceId 照明来源的稳定业务标识。
 * @param offset 照明提供的整数视野修正，通常用于抵消黑夜的负修正。
 * @returns 已校验且不可变的照明视野修正。
 * @throws 来源标识为空或修正不是安全整数时抛出错误。
 */
export function createIlluminationVisionModifier(
  sourceId: string,
  offset: number,
): VisionRangeModifier {
  assertNonEmptyString(sourceId, "sourceId");
  assertSafeInteger(offset, "offset");

  return Object.freeze({ sourceId, kind: "illumination", offset });
}

/**
 * 方法名：calculateEffectiveVisionRange
 * 作用：将基础视野与环境、照明等修正相加，并统一限制最终视野至少为一格。
 * @param baseVisionRange 角色、装备和属性系统提供的基础视野范围。
 * @param modifiers 当前可生效的环境或照明视野修正集合。
 * @returns 应交由地图视线算法使用的最终整数视野范围。
 * @throws 基础视野或任意修正定义非法、来源重复时抛出错误。
 */
export function calculateEffectiveVisionRange(
  baseVisionRange: number,
  modifiers: readonly VisionRangeModifier[] = [],
): number {
  assertNonNegativeSafeInteger(baseVisionRange, "baseVisionRange");
  validateVisionRangeModifiers(modifiers);

  const totalOffset = modifiers.reduce((total, modifier) => total + modifier.offset, 0);

  if (!Number.isSafeInteger(totalOffset) || !Number.isSafeInteger(baseVisionRange + totalOffset)) {
    throw new RangeError("Vision range calculation exceeds safe integer range");
  }

  return Math.max(MINIMUM_EFFECTIVE_VISION_RANGE, baseVisionRange + totalOffset);
}

/**
 * 方法名：validateVisionRangeModifiers
 * 作用：校验视野修正来源唯一、类型受支持且数值可安全参与整数计算。
 * @param modifiers 需要校验的视野修正集合。
 * @returns 无返回值。
 * @throws 修正来源为空、重复、类型不支持或数值非法时抛出错误。
 */
export function validateVisionRangeModifiers(modifiers: readonly VisionRangeModifier[]): void {
  const sourceIds = new Set<string>();

  for (const modifier of modifiers) {
    assertNonEmptyString(modifier.sourceId, "vision modifier sourceId");
    assertSafeInteger(modifier.offset, "vision modifier offset");

    if (modifier.kind !== "environment" && modifier.kind !== "illumination") {
      throw new RangeError(`Unsupported vision modifier kind: ${modifier.kind}`);
    }
    if (sourceIds.has(modifier.sourceId)) {
      throw new Error(`Duplicate vision modifier source id: ${modifier.sourceId}`);
    }

    sourceIds.add(modifier.sourceId);
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

/** 校验数值为安全整数。 */
function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${field} must be a safe integer`);
  }
}

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
