import { describe, expect, it } from "vitest";

import { RandomStream } from "../random/core/random-stream.ts";
import { createRandomStreamSeed } from "../random/core/random-seed.ts";

import { attemptReincarnation } from "./reincarnation-roll.ts";
import type { SoulState } from "./soul-state.ts";

describe("reincarnation roll", () => {
  it("每个自身回合只允许进行一次轮回申请", () => {
    const failed = attemptReincarnation(createReadySoul(), createStream(), 8);

    expect(() => attemptReincarnation(failed.state, createStream(), 8)).toThrow(
      "once per owner turn",
    );
  });

  it("连续失败三次后改为同时投掷两枚 D20", () => {
    const result = attemptReincarnation(
      createReadySoul({ failedAttemptCount: 3 }),
      createStream(),
      9,
    );

    expect(result.rolls).toHaveLength(2);
  });

  it("连续失败五次后的下一次申请直接成功且不消耗随机流", () => {
    const stream = createStream();
    const result = attemptReincarnation(createReadySoul({ failedAttemptCount: 5 }), stream, 10);

    expect(result).toMatchObject({
      outcome: "SUCCEEDED",
      rolls: [],
      state: { status: "REINCARNATED", failedAttemptCount: 0, lastAttemptTurn: 10 },
    });
    expect(stream.exportState().callCount).toBe(0);
  });
});

/** 创建用于轮回判定测试的准备完成灵魂状态。 */
function createReadySoul(overrides: Partial<SoulState> = {}): SoulState {
  return {
    participantId: "player_a",
    status: "READY",
    remainingWaitTurns: 0,
    failedAttemptCount: 0,
    lastAttemptTurn: null,
    ...overrides,
  };
}

/** 创建用于轮回判定测试的确定性轮回随机流。 */
function createStream(): RandomStream {
  return RandomStream.create("reincarnation", null, createRandomStreamSeed("0123456789abcdef"));
}
