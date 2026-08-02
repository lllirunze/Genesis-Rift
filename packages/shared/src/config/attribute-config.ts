/** 所有基础属性的固定键集合，也是属性配置和计算的统一遍历顺序。 */
export const PRIMARY_ATTRIBUTE_KEYS = [
  /** 身体力量、爆发能力与近身作战倾向。 */
  "strength",
  /** 生命力、耐久能力与身体素质。 */
  "constitution",
  /** 能量、法术与精神力量的掌控能力。 */
  "spirit",
  /** 行动能力、反应速度与身体协调性。 */
  "agility",
  /** 理解、学习与感知世界规律的能力。 */
  "insight",
] as const;
