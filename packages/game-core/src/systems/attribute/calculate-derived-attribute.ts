import {
  PRIMARY_ATTRIBUTE_KEYS,
  type DerivedAttributeFormulaConfig,
  type PrimaryAttributeOffset,
  type PrimaryAttributes,
} from "@genesis-rift/shared";

/** 描述当前模块对外公开的业务数据契约。 */
export interface CalculateDerivedAttributeInput {
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly config: DerivedAttributeFormulaConfig;
  readonly primaryDynamicOffset?: PrimaryAttributeOffset;
  readonly derivedDynamicOffset?: number;
}

/**
 * 方法名：calculateDerivedAttribute
 * 作用：根据输入执行确定性计算并返回结果。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
export function calculateDerivedAttribute(input: CalculateDerivedAttributeInput): number {
  const { currentPrimaryAttributes, config } = input;
  const primaryDynamicOffset = input.primaryDynamicOffset ?? {};
  const derivedDynamicOffset = input.derivedDynamicOffset ?? 0;

  validateFormulaConfig(config);
  assertFiniteNumber(derivedDynamicOffset, "derivedDynamicOffset");

  let rawValue = config.derivedStaticOffset + derivedDynamicOffset;

  assertFiniteNumber(rawValue, "initial derived attribute value");

  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    const currentValue = currentPrimaryAttributes[attribute];
    const staticOffset = config.primaryStaticOffset[attribute];
    const dynamicOffset = primaryDynamicOffset[attribute] ?? 0;
    const coefficient = config.coefficients[attribute];

    assertFiniteNumber(currentValue, `currentPrimaryAttributes.${attribute}`);
    assertFiniteNumber(staticOffset, `primaryStaticOffset.${attribute}`);
    assertFiniteNumber(dynamicOffset, `primaryDynamicOffset.${attribute}`);
    assertFiniteNumber(coefficient, `coefficients.${attribute}`);

    const finalPrimaryValue = currentValue + staticOffset + dynamicOffset;
    const contribution = finalPrimaryValue * coefficient;

    assertFiniteNumber(finalPrimaryValue, `finalPrimaryAttributes.${attribute}`);
    assertFiniteNumber(contribution, `${attribute} contribution`);

    rawValue += contribution;
    assertFiniteNumber(rawValue, "derived attribute calculation result");
  }

  const roundedValue = applyRounding(rawValue, config.roundingMode);
  const minimumLimitedValue = Math.max(roundedValue, config.minimum);

  return config.maximum === null
    ? minimumLimitedValue
    : Math.min(minimumLimitedValue, config.maximum);
}

/**
 * 方法名：validateFormulaConfig
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param config 待使用或校验的配置。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateFormulaConfig(config: DerivedAttributeFormulaConfig): void {
  assertFiniteNumber(config.derivedStaticOffset, "derivedStaticOffset");
  assertFiniteNumber(config.minimum, "minimum");

  if (config.maximum !== null) {
    assertFiniteNumber(config.maximum, "maximum");

    if (config.minimum > config.maximum) {
      throw new RangeError("minimum must not exceed maximum");
    }
  }
}

/**
 * 方法名：applyRounding
 * 作用：执行该方法负责的业务规则并返回结算结果。
 * @param value 待处理的值。
 * @param roundingMode 方法所需的 roundingMode 参数。
 * @returns 本次处理得到的结果。
 */
function applyRounding(
  value: number,
  roundingMode: DerivedAttributeFormulaConfig["roundingMode"],
): number {
  const floatingPointTolerance = Number.EPSILON * Math.max(1, Math.abs(value));

  switch (roundingMode) {
    case "floor":
      return Math.floor(value + floatingPointTolerance);
    case "ceil":
      return Math.ceil(value - floatingPointTolerance);
  }
}

/**
 * 方法名：assertFiniteNumber
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
}
