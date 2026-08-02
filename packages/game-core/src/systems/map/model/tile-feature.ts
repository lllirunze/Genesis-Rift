import { TILE_FEATURE_TYPES } from "../map-content-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type TileFeatureType = (typeof TILE_FEATURE_TYPES)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface TileFeature {
  readonly featureId: string;
  readonly type: TileFeatureType;
  readonly referenceId: string;
}

/**
 * 方法名：validateTileFeatures
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param features 方法所需的 features 参数。
 * @returns 本次处理得到的结果。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateTileFeatures(features: readonly TileFeature[]): readonly TileFeature[] {
  const featureIds = new Set<string>();

  for (const feature of features) {
    assertNonEmptyString(feature.featureId, "featureId");
    assertNonEmptyString(feature.referenceId, "referenceId");

    if (!TILE_FEATURE_TYPES.includes(feature.type)) {
      throw new RangeError(`Unsupported tile feature type: ${feature.type}`);
    }

    if (featureIds.has(feature.featureId)) {
      throw new Error(`Duplicate tile feature id: ${feature.featureId}`);
    }

    featureIds.add(feature.featureId);
  }

  return Object.freeze(features.map((feature) => Object.freeze({ ...feature })));
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
