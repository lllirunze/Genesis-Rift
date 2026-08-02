import { PRIMARY_ATTRIBUTE_KEYS } from "../config/attribute-config.ts";

/** 五维基础属性中的单个属性标识。 */
export type PrimaryAttribute = (typeof PRIMARY_ATTRIBUTE_KEYS)[number];
/** 完整且只读的五维基础属性集合。 */
export type PrimaryAttributes = Readonly<Record<PrimaryAttribute, number>>;
/** 仅包含发生变化项目的基础属性偏移集合。 */
export type PrimaryAttributeOffset = Readonly<Partial<Record<PrimaryAttribute, number>>>;

/** 派生属性计算完成后支持的整数取整方式。 */
export type RoundingMode = "floor" | "ceil";

/** 派生属性统一公式所需的固定配置。 */
export interface DerivedAttributeFormulaConfig {
  /** 五项基础属性参与公式时各自使用的系数。 */
  readonly coefficients: PrimaryAttributes;
  /** 进入系数计算前施加的基础属性静态偏移。 */
  readonly primaryStaticOffset: PrimaryAttributes;
  /** 系数计算完成后施加的派生属性静态偏移。 */
  readonly derivedStaticOffset: number;
  /** 最终结果转为整数时使用的取整规则。 */
  readonly roundingMode: RoundingMode;
  /** 派生属性允许得到的最小值。 */
  readonly minimum: number;
  /** 派生属性上限；null 表示不设置上限。 */
  readonly maximum: number | null;
}
