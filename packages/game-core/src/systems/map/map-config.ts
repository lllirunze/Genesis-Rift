/** 基础地图包含的最大环数。 */
export const BASE_MAP_MAX_RING = 10;
/** 为允许边界地块向外移动而额外开放的坐标范围。 */
export const BOUNDARY_COORDINATE_OFFSET = 1;
/** 任意立方体坐标轴允许出现的最大值。 */
export const MAX_CUBE_COORDINATE = BASE_MAP_MAX_RING + BOUNDARY_COORDINATE_OFFSET;
/** 任意立方体坐标轴允许出现的最小值。 */
export const MIN_CUBE_COORDINATE = -MAX_CUBE_COORDINATE;
/** 十环基础地图在不含外扩边界时的地块总数。 */
export const BASE_MAP_TILE_COUNT = 1 + 3 * BASE_MAP_MAX_RING * (BASE_MAP_MAX_RING + 1);

/** 地块允许设置的最低高度。 */
export const MIN_TILE_ELEVATION = -3;
/** 地块允许设置的最高高度。 */
export const MAX_TILE_ELEVATION = 20;

/** 位于零环中心位置的固定坐标。 */
export const HEX_MAP_CENTER = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
});

/** 平顶六边形按照正北起始、顺时针排列的六个方向。 */
export const HEX_DIRECTIONS = [
  /** 正北。 */
  "NORTH",
  /** 北偏东六十度。 */
  "NORTH_EAST_60",
  /** 南偏东六十度。 */
  "SOUTH_EAST_60",
  /** 正南。 */
  "SOUTH",
  /** 南偏西六十度。 */
  "SOUTH_WEST_60",
  /** 北偏西六十度。 */
  "NORTH_WEST_60",
] as const;

/** 六个方向对应的方位角与立方体坐标增量。 */
export const HEX_DIRECTION_DEFINITIONS = {
  NORTH: { bearingDegrees: 0, vector: { x: 0, y: 1, z: -1 } },
  NORTH_EAST_60: { bearingDegrees: 60, vector: { x: 1, y: 0, z: -1 } },
  SOUTH_EAST_60: { bearingDegrees: 120, vector: { x: 1, y: -1, z: 0 } },
  SOUTH: { bearingDegrees: 180, vector: { x: 0, y: -1, z: 1 } },
  SOUTH_WEST_60: { bearingDegrees: 240, vector: { x: -1, y: 0, z: 1 } },
  NORTH_WEST_60: { bearingDegrees: 300, vector: { x: -1, y: 1, z: 0 } },
} as const;

/** 一步移动相对当前环数可能形成的关系。 */
export const RING_MOVEMENT_RELATIONS = ["INWARD", "SAME_RING", "OUTWARD"] as const;
