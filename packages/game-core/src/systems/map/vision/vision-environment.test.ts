import { describe, expect, it } from "vitest";

import { createDayNightRuntimeState, getDayNightEnvironmentView } from "../../environment/index.ts";
import {
  calculateEffectiveVisionRange,
  createDayNightVisionModifier,
  createIlluminationVisionModifier,
} from "./vision-environment.ts";

describe("vision environment", () => {
  it("在黑夜降低视野，并将最终范围限制为至少一格", () => {
    const nightModifier = createDayNightVisionModifier(
      getDayNightEnvironmentView(createDayNightRuntimeState(6)),
    );

    expect(calculateEffectiveVisionRange(1, [nightModifier])).toBe(1);
    expect(calculateEffectiveVisionRange(3, [nightModifier])).toBe(2);
  });

  it("允许照明来源抵消黑夜视野修正", () => {
    const nightModifier = createDayNightVisionModifier(
      getDayNightEnvironmentView(createDayNightRuntimeState(6)),
    );
    const torchModifier = createIlluminationVisionModifier("item.torch", 1);

    expect(calculateEffectiveVisionRange(3, [nightModifier, torchModifier])).toBe(3);
  });
});
