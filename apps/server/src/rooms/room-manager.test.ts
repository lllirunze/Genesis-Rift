import { describe, expect, it } from "vitest";

import type { LanRoomPlayerSnapshot, PlayerId, RoomId } from "@genesis-rift/shared";

import { RoomManager, RoomManagerError } from "./room-manager.ts";

const ROOM_ID = "room-local-001" as RoomId;
const HOST = {
  playerId: "player-host" as PlayerId,
  displayName: "Host",
} satisfies LanRoomPlayerSnapshot;
const GUEST = {
  playerId: "player-guest" as PlayerId,
  displayName: "Guest",
} satisfies LanRoomPlayerSnapshot;

describe("RoomManager", () => {
  it("creates an authoritative lobby and adds the host as its first player", () => {
    const manager = new RoomManager();
    const room = manager.createRoom(ROOM_ID, HOST);

    expect(room).toEqual({
      roomId: ROOM_ID,
      hostPlayerId: HOST.playerId,
      status: "lobby",
      revision: 1,
      players: [HOST],
    });
    expect(Object.isFrozen(room)).toBe(true);
    expect(Object.isFrozen(room.players)).toBe(true);
  });

  it("joins a player by replacing the stored immutable snapshot and increasing revision", () => {
    const manager = new RoomManager();
    const created = manager.createRoom(ROOM_ID, HOST);
    const joined = manager.joinRoom(GUEST);

    expect(created.players).toEqual([HOST]);
    expect(joined.revision).toBe(2);
    expect(joined.players).toEqual([HOST, GUEST]);
    expect(manager.getRoom()).toBe(joined);
  });

  it("returns stable errors for duplicate rooms, duplicate players, and missing rooms", () => {
    const manager = new RoomManager();
    manager.createRoom(ROOM_ID, HOST);

    expectRoomManagerError(
      () => manager.createRoom("room-local-002" as RoomId, GUEST),
      "ROOM_ALREADY_EXISTS",
    );
    expectRoomManagerError(() => manager.joinRoom(HOST), "PLAYER_ALREADY_JOINED");
    expectRoomManagerError(() => new RoomManager().getRoom(), "ROOM_NOT_FOUND");
  });
});

/** 断言房间管理器返回的错误类型及其稳定协议错误码。 */
function expectRoomManagerError(action: () => unknown, code: RoomManagerError["code"]): void {
  try {
    action();
    throw new Error("Expected RoomManagerError");
  } catch (error) {
    expect(error).toBeInstanceOf(RoomManagerError);
    expect((error as RoomManagerError).code).toBe(code);
  }
}
