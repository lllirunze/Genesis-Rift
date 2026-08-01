export const LOG_ACTIONS = [
  "System",
  "Player",
  "Battle",
  "Move",
  "Map",
  "Item",
  "Equip",
  "Level",
  "Quest",
  "Weather",
  "Hand",
  "Npc",
  "Shop",
  "Random",
  "Save",
  "Load",
  "Network",
] as const;

export type LogAction = (typeof LOG_ACTIONS)[number];

export function isLogAction(value: string): value is LogAction {
  return LOG_ACTIONS.some((action) => action === value);
}
