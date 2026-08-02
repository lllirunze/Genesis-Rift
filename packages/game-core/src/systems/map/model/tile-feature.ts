import { TILE_FEATURE_TYPES } from "../map-content-config.ts";

export type TileFeatureType = (typeof TILE_FEATURE_TYPES)[number];

export interface TileFeature {
  readonly featureId: string;
  readonly type: TileFeatureType;
  readonly referenceId: string;
}

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

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
