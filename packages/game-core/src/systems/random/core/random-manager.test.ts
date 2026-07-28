import { describe, expect, it } from "vitest";

import { RandomManager } from "./random-manager.ts";
import { createMasterSeed, createRandomStreamSeed } from "./random-seed.ts";

const MASTER_SEED = createMasterSeed(
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
);

describe("RandomManager", () => {
  it("reuses the same stream identity and isolates different module streams", () => {
    const firstManager = RandomManager.create(MASTER_SEED);
    const combatStream = firstManager.getStream("combat");

    expect(firstManager.getStream("combat")).toBe(combatStream);

    for (let index = 0; index < 20; index += 1) {
      combatStream.nextInt(0, 100);
    }

    const firstWeatherValues = Array.from({ length: 5 }, () =>
      firstManager.getStream("weather").nextInt(0, 100),
    );
    const secondManager = RandomManager.create(MASTER_SEED);
    const secondWeatherValues = Array.from({ length: 5 }, () =>
      secondManager.getStream("weather").nextInt(0, 100),
    );

    expect(firstWeatherValues).toEqual(secondWeatherValues);
  });

  it("isolates streams with different stable scope ids", () => {
    const firstManager = RandomManager.create(MASTER_SEED);
    const firstBattle = firstManager.getStream("combat", "battle-1");

    for (let index = 0; index < 10; index += 1) {
      firstBattle.nextInt(0, 100);
    }

    const battleTwoValues = Array.from({ length: 5 }, () =>
      firstManager.getStream("combat", "battle-2").nextInt(0, 100),
    );
    const secondManager = RandomManager.create(MASTER_SEED);
    const untouchedBattleTwoValues = Array.from({ length: 5 }, () =>
      secondManager.getStream("combat", "battle-2").nextInt(0, 100),
    );

    expect(battleTwoValues).toEqual(untouchedBattleTwoValues);
  });

  it("restores every created stream without changing its continuation", () => {
    const manager = RandomManager.create(MASTER_SEED);
    manager.getStream("loot", "chest-1").nextInt(1, 7);
    manager.getStream("weather").nextInt(0, 13);

    const restoredManager = RandomManager.restore(manager.exportState());

    expect(restoredManager.getStream("loot", "chest-1").nextInt(1, 7)).toBe(
      manager.getStream("loot", "chest-1").nextInt(1, 7),
    );
    expect(restoredManager.getStream("weather").nextInt(0, 13)).toBe(
      manager.getStream("weather").nextInt(0, 13),
    );
  });

  it("rejects restored stream state that does not belong to the master seed", () => {
    const manager = RandomManager.create(MASTER_SEED);
    manager.getStream("weather");
    const state = manager.exportState();
    const streamState = state.streams[0]!;

    expect(() =>
      RandomManager.restore({
        ...state,
        streams: [
          {
            ...streamState,
            initialSeed: createRandomStreamSeed("0000000000000000"),
          },
        ],
      }),
    ).toThrow("Random stream seed does not match its identity");
  });
});
