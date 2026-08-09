import { describe, expect, it } from "vitest";

import type { PlayerId } from "@genesis-rift/shared";

import {
  cancelPlayerTrade,
  confirmPlayerTrade,
  createPlayerTradeState,
  expirePlayerTrade,
} from "./player-trade-state.ts";

const INITIATOR_ID = "player-initiator" as PlayerId;
const RECIPIENT_ID = "player-recipient" as PlayerId;

describe("player trade state", () => {
  it("requires both participants to confirm before becoming confirmed", () => {
    const pendingTrade = createTrade();
    const initiatorConfirmed = confirmPlayerTrade(pendingTrade, INITIATOR_ID, 8);
    const confirmedTrade = confirmPlayerTrade(initiatorConfirmed, RECIPIENT_ID, 8);

    expect(initiatorConfirmed.status).toBe("PENDING");
    expect(confirmedTrade.status).toBe("CONFIRMED");
    expect(confirmedTrade.initiatorConfirmed).toBe(true);
    expect(confirmedTrade.recipientConfirmed).toBe(true);
    expect(pendingTrade.initiatorConfirmed).toBe(false);
  });

  it("allows a participant to cancel only a pending trade and expires it after the deadline", () => {
    const pendingTrade = createTrade();
    const cancelledTrade = cancelPlayerTrade(pendingTrade, RECIPIENT_ID);
    const expiredTrade = expirePlayerTrade(createTrade(), 11);

    expect(cancelledTrade.status).toBe("CANCELLED");
    expect(expiredTrade.status).toBe("EXPIRED");
    expect(() => confirmPlayerTrade(expiredTrade, INITIATOR_ID, 11)).toThrow(
      "Only pending player trades",
    );
  });

  it("rejects duplicate item instances in one offer and confirmations by other players", () => {
    expect(() =>
      createPlayerTradeState(
        "trade-runtime-001",
        INITIATOR_ID,
        RECIPIENT_ID,
        { itemInstanceIds: ["item-instance-001", "item-instance-001"], coin: 0 },
        { itemInstanceIds: [], coin: 0 },
        10,
      ),
    ).toThrow("Duplicate offered item instance");
    expect(() => confirmPlayerTrade(createTrade(), "player-other" as PlayerId, 8)).toThrow(
      "Only trade participants",
    );
  });
});

/** 创建用于交易状态测试的固定报价。 */
function createTrade() {
  return createPlayerTradeState(
    "trade-runtime-001",
    INITIATOR_ID,
    RECIPIENT_ID,
    { itemInstanceIds: ["item-instance-001"], coin: 2 },
    { itemInstanceIds: ["item-instance-002"], coin: 1 },
    10,
  );
}
