import { describe, expect, it } from "vitest";

import { calculateDeathCoinLoss } from "./death-coin-loss.ts";

describe("death coin loss", () => {
  it("按当前元宝的百分之二十向下取整计算损失", () => {
    expect(calculateDeathCoinLoss(19)).toEqual({
      previousCoinQuantity: 19,
      lostCoinQuantity: 3,
      remainingCoinQuantity: 16,
    });
  });

  it("元宝不足五个时不产生负数或额外损失", () => {
    expect(calculateDeathCoinLoss(4)).toEqual({
      previousCoinQuantity: 4,
      lostCoinQuantity: 0,
      remainingCoinQuantity: 4,
    });
  });
});
