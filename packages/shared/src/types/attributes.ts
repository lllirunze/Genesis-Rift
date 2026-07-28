export const PRIMARY_ATTRIBUTE_KEYS = [
  "strength",
  "constitution",
  "spirit",
  "agility",
  "insight",
] as const;

export type PrimaryAttribute = (typeof PRIMARY_ATTRIBUTE_KEYS)[number];
export type PrimaryAttributes = Readonly<Record<PrimaryAttribute, number>>;
export type PrimaryAttributeOffset = Readonly<Partial<Record<PrimaryAttribute, number>>>;

export type RoundingMode = "floor" | "ceil";

export interface DerivedAttributeFormulaConfig {
  readonly coefficients: PrimaryAttributes;
  readonly primaryStaticOffset: PrimaryAttributes;
  readonly derivedStaticOffset: number;
  readonly roundingMode: RoundingMode;
  readonly minimum: number;
  readonly maximum: number | null;
}
