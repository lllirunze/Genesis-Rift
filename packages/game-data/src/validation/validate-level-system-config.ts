import type { LevelSystemConfig } from "@genesis-rift/shared";

export function validateLevelSystemConfig(config: LevelSystemConfig): void {
  assertPositiveSafeInteger(config.initialLevel, "initialLevel");
  assertPositiveSafeInteger(config.maximumLevel, "maximumLevel");

  if (config.initialLevel > config.maximumLevel) {
    throw new RangeError("initialLevel must not exceed maximumLevel");
  }

  const expectedLevelCount = config.maximumLevel - config.initialLevel + 1;

  if (config.levels.length !== expectedLevelCount) {
    throw new Error(`levels must contain exactly ${expectedLevelCount} definitions`);
  }

  for (const [index, definition] of config.levels.entries()) {
    const expectedLevel = config.initialLevel + index;

    if (definition.level !== expectedLevel) {
      throw new Error(
        `levels[${index}].level must be ${expectedLevel}, received ${definition.level}`,
      );
    }

    assertNonNegativeSafeInteger(
      definition.experienceRequired,
      `levels[${index}].experienceRequired`,
    );
    assertNonNegativeSafeInteger(
      definition.freePrimaryAttributePoints,
      `levels[${index}].freePrimaryAttributePoints`,
    );

    if (definition.level === config.initialLevel) {
      if (definition.experienceRequired !== 0) {
        throw new Error("the initial level must not require experience");
      }

      if (definition.freePrimaryAttributePoints !== 0) {
        throw new Error("the initial level must not grant level-up attribute points");
      }

      continue;
    }

    if (definition.experienceRequired === 0) {
      throw new Error(`level ${definition.level} must require positive experience`);
    }
  }
}

function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
}
