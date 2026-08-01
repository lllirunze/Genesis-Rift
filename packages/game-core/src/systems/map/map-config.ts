export const BASE_MAP_MAX_RING = 10;
export const BOUNDARY_COORDINATE_OFFSET = 1;
export const MAX_CUBE_COORDINATE = BASE_MAP_MAX_RING + BOUNDARY_COORDINATE_OFFSET;
export const MIN_CUBE_COORDINATE = -MAX_CUBE_COORDINATE;
export const BASE_MAP_TILE_COUNT = 1 + 3 * BASE_MAP_MAX_RING * (BASE_MAP_MAX_RING + 1);

export const MIN_TILE_ELEVATION = -3;
export const MAX_TILE_ELEVATION = 20;

export const HEX_MAP_CENTER = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
});

export const HEX_DIRECTIONS = [
  "NORTH",
  "NORTH_EAST_60",
  "SOUTH_EAST_60",
  "SOUTH",
  "SOUTH_WEST_60",
  "NORTH_WEST_60",
] as const;

export const HEX_DIRECTION_DEFINITIONS = {
  NORTH: { bearingDegrees: 0, vector: { x: 0, y: 1, z: -1 } },
  NORTH_EAST_60: { bearingDegrees: 60, vector: { x: 1, y: 0, z: -1 } },
  SOUTH_EAST_60: { bearingDegrees: 120, vector: { x: 1, y: -1, z: 0 } },
  SOUTH: { bearingDegrees: 180, vector: { x: 0, y: -1, z: 1 } },
  SOUTH_WEST_60: { bearingDegrees: 240, vector: { x: -1, y: 0, z: 1 } },
  NORTH_WEST_60: { bearingDegrees: 300, vector: { x: -1, y: 1, z: 0 } },
} as const;

export const RING_MOVEMENT_RELATIONS = ["INWARD", "SAME_RING", "OUTWARD"] as const;
