import { describe, expect, it } from "vitest";

import { getOrCreateLanPlayerIdentity, LAN_PLAYER_ID_STORAGE_KEY } from "./lan-player-identity.ts";

describe("getOrCreateLanPlayerIdentity", () => {
  it("creates a player id once and reuses the persisted value on later calls", () => {
    const storage = new MemoryStorage();
    const first = getOrCreateLanPlayerIdentity(storage, () => "player-browser-001");
    const second = getOrCreateLanPlayerIdentity(storage, () => "player-browser-002");

    expect(first.playerId).toBe("player-browser-001");
    expect(second).toEqual(first);
    expect(storage.getItem(LAN_PLAYER_ID_STORAGE_KEY)).toBe("player-browser-001");
  });

  it("rejects an empty generated identity instead of persisting an unusable player id", () => {
    expect(() => getOrCreateLanPlayerIdentity(new MemoryStorage(), () => " ")).toThrow(
      "must not be empty",
    );
  });
});

/** 提供不依赖浏览器环境的最小本地存储实现。 */
class MemoryStorage {
  readonly #values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}
