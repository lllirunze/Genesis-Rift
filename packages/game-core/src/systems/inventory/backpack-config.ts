export const BACKPACK_GRID_WIDTH = 6;
export const BACKPACK_GRID_HEIGHT = 8;

export const BACKPACK_LEVELS = [1, 2, 3] as const;

export const BACKPACK_USABLE_AREAS = {
  1: { width: 4, height: 6 },
  2: { width: 6, height: 6 },
  3: { width: 6, height: 8 },
} as const;
