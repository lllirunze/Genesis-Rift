import { describe, expect, it } from "vitest";

import type {
  CreateLanRoomRequest,
  JoinLanRoomRequest,
  LanRoomSnapshot,
  PlayerId,
  RequestLanRoomSnapshot,
  RoomId,
} from "@genesis-rift/shared";

import { RoomManager } from "../rooms/room-manager.ts";
import { SocketSessionManager } from "../sessions/socket-session-manager.ts";
import {
  bindRoomSocketEvents,
  type RoomSnapshotBroadcaster,
  type RoomSocket,
} from "./bind-room-socket-events.ts";

const ROOM_ID = "room-local-001" as RoomId;
const HOST_ID = "player-host" as PlayerId;
const GUEST_ID = "player-guest" as PlayerId;

describe("bindRoomSocketEvents", () => {
  it("creates and joins the single LAN room while broadcasting each authoritative snapshot", () => {
    const rooms = new RoomManager();
    const sessions = new SocketSessionManager();
    const broadcaster = new FakeRoomBroadcaster();
    const host = new FakeRoomSocket("socket-host");
    const guest = new FakeRoomSocket("socket-guest");
    bindRoomSocketEvents(host as unknown as RoomSocket, broadcaster, rooms, sessions);
    bindRoomSocketEvents(guest as unknown as RoomSocket, broadcaster, rooms, sessions);

    host.trigger("room:create", {
      requestId: "request-create",
      roomId: ROOM_ID,
      host: { playerId: HOST_ID, displayName: "Host" },
    });
    guest.trigger("room:join", {
      requestId: "request-join",
      player: { playerId: GUEST_ID, displayName: "Guest" },
    });

    expect(host.joinedRoomIds).toEqual([ROOM_ID]);
    expect(guest.joinedRoomIds).toEqual([ROOM_ID]);
    expect(host.getEmitted("room:created")[0]).toMatchObject({ requestId: "request-create" });
    expect(guest.getEmitted("room:joined")[0]).toMatchObject({ requestId: "request-join" });
    expect(broadcaster.snapshots).toHaveLength(2);
    expect(broadcaster.snapshots[1]?.payload.room.players).toHaveLength(2);
    expect(sessions.getJoinedSession("socket-guest").playerId).toBe(GUEST_ID);
  });

  it("rejects identity changes and snapshot requests from sockets that have not joined", () => {
    const rooms = new RoomManager();
    const sessions = new SocketSessionManager();
    const broadcaster = new FakeRoomBroadcaster();
    const host = new FakeRoomSocket("socket-host");
    const observer = new FakeRoomSocket("socket-observer");
    bindRoomSocketEvents(host as unknown as RoomSocket, broadcaster, rooms, sessions);
    bindRoomSocketEvents(observer as unknown as RoomSocket, broadcaster, rooms, sessions);

    host.trigger("room:create", {
      requestId: "request-create",
      roomId: ROOM_ID,
      host: { playerId: HOST_ID, displayName: "Host" },
    });
    host.trigger("room:join", {
      requestId: "request-spoof",
      player: { playerId: GUEST_ID, displayName: "Guest" },
    });
    observer.trigger("room:requestSnapshot", { requestId: "request-observer" });

    expect(host.getEmitted("room:rejected")[0]).toMatchObject({
      requestId: "request-spoof",
      code: "SOCKET_IDENTITY_MISMATCH",
    });
    expect(observer.getEmitted("room:rejected")[0]).toMatchObject({
      requestId: "request-observer",
      code: "NOT_JOINED",
    });
    expect(rooms.getRoom().players).toHaveLength(1);
  });

  it("clears a disconnected socket session so it cannot request a room snapshot", () => {
    const rooms = new RoomManager();
    const sessions = new SocketSessionManager();
    const broadcaster = new FakeRoomBroadcaster();
    const host = new FakeRoomSocket("socket-host");
    bindRoomSocketEvents(host as unknown as RoomSocket, broadcaster, rooms, sessions);

    host.trigger("room:create", {
      requestId: "request-create",
      roomId: ROOM_ID,
      host: { playerId: HOST_ID, displayName: "Host" },
    });
    host.trigger("disconnect");
    host.trigger("room:requestSnapshot", { requestId: "request-after-disconnect" });

    expect(host.getEmitted("room:rejected")[0]).toMatchObject({
      requestId: "request-after-disconnect",
      code: "NOT_JOINED",
    });
  });
});

/** 提供可触发请求、记录服务端响应的内存 Socket 实现。 */
class FakeRoomSocket {
  readonly joinedRoomIds: string[] = [];
  readonly #listeners = new Map<string, (payload?: unknown) => void>();
  readonly #emitted = new Map<string, unknown[]>();

  constructor(readonly id: string) {}

  on(event: string, listener: (payload?: unknown) => void): void {
    this.#listeners.set(event, listener);
  }

  emit(event: string, payload: unknown): void {
    const records = this.#emitted.get(event) ?? [];
    records.push(payload);
    this.#emitted.set(event, records);
  }

  join(roomId: string): void {
    this.joinedRoomIds.push(roomId);
  }

  trigger(event: "disconnect"): void;
  trigger(event: "room:create", payload: CreateLanRoomRequest): void;
  trigger(event: "room:join", payload: JoinLanRoomRequest): void;
  trigger(event: "room:requestSnapshot", payload: RequestLanRoomSnapshot): void;
  trigger(event: string, payload?: unknown): void {
    this.#listeners.get(event)?.(payload);
  }

  getEmitted(event: "room:created" | "room:joined" | "room:rejected"): readonly unknown[] {
    return this.#emitted.get(event) ?? [];
  }
}

/** 提供可记录房间快照广播的内存广播器实现。 */
class FakeRoomBroadcaster implements RoomSnapshotBroadcaster {
  readonly snapshots: {
    readonly roomId: string;
    readonly payload: { readonly requestId: string; readonly room: LanRoomSnapshot };
  }[] = [];

  to(roomId: string) {
    return {
      emit: (
        event: "room:snapshot",
        payload: { readonly requestId: string; readonly room: LanRoomSnapshot },
      ) => {
        if (event === "room:snapshot") {
          this.snapshots.push({ roomId, payload });
        }
      },
    };
  }
}
