import {
  PRIMARY_ATTRIBUTE_KEYS,
  type DerivedAttributeFormulaConfig,
  type PrimaryAttributeOffset,
  type PrimaryAttributes,
} from "@genesis-rift/shared";

export interface CalculateDerivedAttributeInput {
  readonly currentPrimaryAttributes: PrimaryAttributes;
  readonly config: DerivedAttributeFormulaConfig;
  readonly primaryDynamicOffset?: PrimaryAttributeOffset;
  readonly derivedDynamicOffset?: number;
}

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

function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
}
