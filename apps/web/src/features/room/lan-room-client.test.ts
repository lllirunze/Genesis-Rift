import { describe, expect, it } from "vitest";

import type { LanRoomSnapshot, PlayerId, RoomId } from "@genesis-rift/shared";

import type { LanSocket } from "../../lib/socket-client.ts";
import { LanRoomClient } from "./lan-room-client.ts";

const ROOM: LanRoomSnapshot = {
  roomId: "room-local-001" as RoomId,
  hostPlayerId: "player-host" as PlayerId,
  status: "lobby",
  revision: 1,
  players: [{ playerId: "player-host" as PlayerId, displayName: "Host", characterSelection: null }],
};

describe("LanRoomClient", () => {
  it("sends a protocol hello on connection and publishes authoritative room snapshots", () => {
    const socket = new FakeLanSocket();
    const client = new LanRoomClient(socket as unknown as LanSocket);
    const states: unknown[] = [];
    client.subscribe((state) => states.push(state));

    client.connect();
    socket.trigger("room:snapshot", { requestId: "server.roomUpdated", room: ROOM });

    expect(socket.getEmitted("client:hello")).toEqual([{ protocolVersion: 1 }]);
    expect(client.getState()).toMatchObject({ connectionStatus: "connected", room: ROOM });
    expect(states).toHaveLength(4);
  });

  it("forwards create requests and stores server-side rejection information", () => {
    const socket = new FakeLanSocket();
    const client = new LanRoomClient(socket as unknown as LanSocket);
    client.connect();
    client.createRoom("request-create", ROOM.roomId, ROOM.players[0]!);
    socket.trigger("room:rejected", {
      requestId: "request-create",
      code: "ROOM_ALREADY_EXISTS",
      message: "The active LAN room already exists",
    });

    expect(socket.getEmitted("room:create")).toEqual([
      { requestId: "request-create", roomId: ROOM.roomId, host: ROOM.players[0] },
    ]);
    expect(client.getState().rejection).toMatchObject({ code: "ROOM_ALREADY_EXISTS" });
  });

  it("forwards character selection and host start requests after the socket connects", () => {
    const socket = new FakeLanSocket();
    const client = new LanRoomClient(socket as unknown as LanSocket);
    client.connect();

    client.updateCharacterSelection("request-select", {
      gender: "female",
      identityName: "mage",
      raceName: "human",
    });
    client.startGame("request-start");
    client.endActivePlayerTurn("request-turn-end", "command-turn-end");
    client.moveActivePlayer("request-map-move", "command-map-move", "NORTH");
    client.decideEventReveal(
      "request-event-reveal",
      "command-event-reveal",
      "event-instance-001",
      "REVEAL",
    );
    client.selectEventOption(
      "request-event-option",
      "command-event-option",
      "event-instance-001",
      "studyTablet",
    );

    expect(socket.getEmitted("room:updateCharacterSelection")).toEqual([
      {
        requestId: "request-select",
        selection: { gender: "female", identityName: "mage", raceName: "human" },
      },
    ]);
    expect(socket.getEmitted("game:start")).toEqual([{ requestId: "request-start" }]);
    expect(socket.getEmitted("game:command")).toEqual([
      { requestId: "request-turn-end", commandId: "command-turn-end", type: "turn.end" },
      {
        requestId: "request-map-move",
        commandId: "command-map-move",
        type: "map.move",
        direction: "NORTH",
      },
      {
        requestId: "request-event-reveal",
        commandId: "command-event-reveal",
        type: "event.decideReveal",
        instanceId: "event-instance-001",
        action: "REVEAL",
      },
      {
        requestId: "request-event-option",
        commandId: "command-event-option",
        type: "event.selectOption",
        instanceId: "event-instance-001",
        optionId: "studyTablet",
      },
    ]);
  });

  it("does not send room requests before a Socket connection exists", () => {
    const client = new LanRoomClient(new FakeLanSocket() as unknown as LanSocket);

    expect(() => client.requestRoomSnapshot("request-offline")).toThrow("not connected");
  });
});

/** 提供可触发服务端事件并记录客户端发包的内存 Socket。 */
class FakeLanSocket {
  connected = false;
  readonly #listeners = new Map<string, (payload?: unknown) => void>();
  readonly #emitted = new Map<string, unknown[]>();

  connect(): void {
    this.connected = true;
    this.trigger("connect");
  }

  disconnect(): void {
    this.connected = false;
    this.trigger("disconnect");
  }

  on(event: string, listener: (payload?: unknown) => void): void {
    this.#listeners.set(event, listener);
  }

  off(event: string): void {
    this.#listeners.delete(event);
  }

  emit(event: string, payload: unknown): void {
    const records = this.#emitted.get(event) ?? [];
    records.push(payload);
    this.#emitted.set(event, records);
  }

  trigger(event: string, payload?: unknown): void {
    this.#listeners.get(event)?.(payload);
  }

  getEmitted(event: string): readonly unknown[] {
    return this.#emitted.get(event) ?? [];
  }
}
