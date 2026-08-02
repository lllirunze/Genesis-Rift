import type { CubeCoordinate, TileId } from "@genesis-rift/shared";

import { createCubeCoordinate, getCubeCoordinateRing } from "../geometry/cube-coordinate.ts";
import { TILE_PASSABILITY_STATES } from "../map-content-config.ts";
import { BASE_MAP_MAX_RING, MAX_TILE_ELEVATION, MIN_TILE_ELEVATION } from "../map-config.ts";
import type { MapContentDefinitionCatalog } from "./map-content-definition-catalog.ts";
import { getRegionDefinition } from "./region-definition.ts";
import { getTerrainDefinition } from "./terrain-definition.ts";
import { type TileFeature, validateTileFeatures } from "./tile-feature.ts";

export type TilePassability = (typeof TILE_PASSABILITY_STATES)[number];

export interface HexTile {
  readonly tileId: TileId;
  readonly coordinate: CubeCoordinate;
  readonly ring: number;
  readonly elevation: number;
  readonly terrainDefinitionId: string;
  readonly regionDefinitionId: string;
  readonly passability: TilePassability;
  readonly features: readonly TileFeature[];
}

export interface CreateHexTileInput {
  readonly tileId: TileId;
  readonly coordinate: CubeCoordinate;
  readonly elevation: number;
  readonly terrainDefinitionId: string;
  readonly regionDefinitionId: string;
  readonly passability: TilePassability;
  readonly features?: readonly TileFeature[];
}

export function validateTileElevation(elevation: number): void {
  if (!Number.isSafeInteger(elevation)) {
    throw new TypeError("elevation must be a safe integer");
  }

  if (elevation < MIN_TILE_ELEVATION || elevation > MAX_TILE_ELEVATION) {
    throw new RangeError(
      `elevation must be between ${MIN_TILE_ELEVATION} and ${MAX_TILE_ELEVATION}`,
    );
  }
}

export function createHexTile(
  input: CreateHexTileInput,
  definitions: MapContentDefinitionCatalog,
): HexTile {
  if (input.tileId.length === 0) {
    throw new TypeError("tileId must not be empty");
  }

  validateTileElevation(input.elevation);

  const coordinate = createCubeCoordinate(
    input.coordinate.x,
    input.coordinate.y,
    input.coordinate.z,
  );
  const ring = getCubeCoordinateRing(coordinate);

  if (ring > BASE_MAP_MAX_RING) {
    throw new RangeError(`tile coordinate must be within ring ${BASE_MAP_MAX_RING}`);
  }

  getTerrainDefinition(definitions.terrains, input.terrainDefinitionId);
  getRegionDefinition(definitions.regions, input.regionDefinitionId);

  if (!TILE_PASSABILITY_STATES.includes(input.passability)) {
    throw new RangeError(`Unsupported tile passability: ${input.passability}`);
  }

  return {
    tileId: input.tileId,
    coordinate,
    ring,
    elevation: input.elevation,
    terrainDefinitionId: input.terrainDefinitionId,
    regionDefinitionId: input.regionDefinitionId,
    passability: input.passability,
    features: validateTileFeatures(input.features ?? []),
  };
}
