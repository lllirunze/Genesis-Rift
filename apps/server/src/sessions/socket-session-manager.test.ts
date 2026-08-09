import { describe, expect, it } from "vitest";

import type { PlayerId, RoomId } from "@genesis-rift/shared";

import { SocketSessionError, SocketSessionManager } from "./socket-session-manager.ts";

const PLAYER_ID = "player-session" as PlayerId;
const ROOM_ID = "room-session" as RoomId;

describe("SocketSessionManager", () => {
  it("binds an identity once, assigns the active room, and removes disconnected sockets", () => {
    const manager = new SocketSessionManager();
    manager.bindPlayer("socket-001", PLAYER_ID);
    manager.assignRoom("socket-001", ROOM_ID);

    expect(manager.getJoinedSession("socket-001")).toEqual({
      socketId: "socket-001",
      playerId: PLAYER_ID,
      roomId: ROOM_ID,
    });

    manager.removeSocket("socket-001");
    expect(() => manager.getJoinedSession("socket-001")).toThrow(SocketSessionError);
  });

  it("rejects an attempt to change the player identity of an existing socket", () => {
    const manager = new SocketSessionManager();
    manager.bindPlayer("socket-001", PLAYER_ID);

    expect(() => manager.bindPlayer("socket-001", "player-other" as PlayerId)).toThrow(
      "Socket identity cannot change",
    );
  });

  it("reports whether a player identity is still occupied by an active socket", () => {
    const manager = new SocketSessionManager();
    manager.bindPlayer("socket-001", PLAYER_ID);

    expect(manager.isPlayerConnected(PLAYER_ID)).toBe(true);

    manager.removeSocket("socket-001");

    expect(manager.isPlayerConnected(PLAYER_ID)).toBe(false);
  });
});
