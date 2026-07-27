export const PRIMARY_ATTRIBUTE_KEYS = [
  "strength",
  "constitution",
  "spirit",
  "agility",
  "insight",
] as const;

export type PrimaryAttribute = (typeof PRIMARY_ATTRIBUTE_KEYS)[number];

export type PrimaryAttributes = Readonly<Record<PrimaryAttribute, number>>;

export const INITIAL_PRIMARY_ATTRIBUTE_TOTAL = 25;

export function getPrimaryAttributeTotal(attributes: PrimaryAttributes): number {
  return PRIMARY_ATTRIBUTE_KEYS.reduce((total, key) => total + attributes[key], 0);
}
