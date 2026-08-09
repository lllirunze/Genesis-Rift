import { describe, expect, it } from "vitest";

import { advanceDayNightRound } from "./advance-day-night-round.ts";
import {
  createDayNightRuntimeState,
  getDayNightEnvironmentView,
  validateDayNightRuntimeState,
} from "./day-night-runtime-state.ts";

describe("day-night runtime state", () => {
  it("在完整轮次边界推进，并仅在第五轮结束后切换至黑夜", () => {
    const fifthRound = createDayNightRuntimeState(5);
    const result = advanceDayNightRound(fifthRound);

    expect(result).toMatchObject({
      periodChanged: true,
      state: { currentRound: 6, current: { periodId: "night", elapsedRounds: 1 } },
    });
  });

  it("提供可供其他系统读取的公开标签和夜间视野修正", () => {
    const view = getDayNightEnvironmentView(createDayNightRuntimeState(6));

    expect(view).toEqual({
      periodId: "night",
      elapsedRounds: 1,
      remainingRounds: 4,
      phaseIndex: 1,
      publicTags: ["night", "nighttime", "secret-action"],
      visionModifier: -1,
    });
  });

  it("拒绝与完整轮次推导结果不一致的持久化状态", () => {
    expect(() =>
      validateDayNightRuntimeState({
        currentRound: 1,
        current: { periodId: "night", elapsedRounds: 1, remainingRounds: 4, phaseIndex: 1 },
      }),
    ).toThrow("must match its current round");
  });
});
