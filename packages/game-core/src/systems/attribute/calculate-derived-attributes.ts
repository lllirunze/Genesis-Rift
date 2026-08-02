import type {
  DerivedAttributeFormulaConfig,
  PrimaryAttributeOffset,
  PrimaryAttributes,
} from "@genesis-rift/shared";

import { calculateDerivedAttribute } from "./calculate-derived-attribute.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface CalculateDerivedAttributesInput<DerivedAttribute extends string> {
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>;
  readonly primaryDynamicOffset?: PrimaryAttributeOffset;
  readonly derivedDynamicOffset?: Readonly<Partial<Record<DerivedAttribute, number>>>;
}

/**
 * 方法名：calculateDerivedAttributes
 * 作用：根据输入执行确定性计算并返回结果。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function calculateDerivedAttributes<DerivedAttribute extends string>(
  input: CalculateDerivedAttributesInput<DerivedAttribute>,
): Readonly<Record<DerivedAttribute, number>> {
  const derivedAttributes = {} as Record<DerivedAttribute, number>;

  for (const attribute of Object.keys(input.configs) as DerivedAttribute[]) {
    derivedAttributes[attribute] = calculateDerivedAttribute({
      currentPrimaryAttributes: input.currentPrimaryAttributes,
      config: input.configs[attribute],
      primaryDynamicOffset: input.primaryDynamicOffset ?? {},
      derivedDynamicOffset: input.derivedDynamicOffset?.[attribute] ?? 0,
    });
  }

  return derivedAttributes;
}
