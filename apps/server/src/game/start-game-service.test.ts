import { describe, expect, it } from "vitest";
import type { GameSessionState, GameSessionValidationContext } from "@genesis-rift/game-core";
import type { GameId, PlayerId, RoomId } from "@genesis-rift/shared";

import { RoomManager } from "../rooms/room-manager.ts";
import { GameSessionManager } from "./game-session-manager.ts";
import { StartGameService } from "./start-game-service.ts";

const ROOM_ID = "room_000001" as RoomId;
const GAME_ID = "game_000001" as GameId;
const HOST_ID = "player-host" as PlayerId;
const HOST_SELECTION = { gender: "female", identityName: "mage", raceName: "human" } as const;

describe("StartGameService", () => {
  it("lets the host lock the room and start the initialized authority session", () => {
    const roomManager = new RoomManager();
    roomManager.createRoom(ROOM_ID, {
      playerId: HOST_ID,
      displayName: "Host",
      characterSelection: HOST_SELECTION,
    });
    const service = new StartGameService(roomManager, new GameSessionManager(), {
      create: ({ players }) => ({
        state: {
          version: 2,
          gameId: GAME_ID,
          status: "lobby",
          playerOrder: players.map((player) => player.playerId),
          players: players.map((player) => createPlayerSessionState(player.playerId)),
          world: {},
          random: {},
        } as unknown as GameSessionState,
        validationContext: {} as GameSessionValidationContext,
      }),
    });

    const snapshot = service.start(HOST_ID);

    expect(roomManager.getRoom().status).toBe("running");
    expect(snapshot).toMatchObject({ gameId: GAME_ID, status: "running" });
  });

  it("rejects non-host start requests before creating a game session", () => {
    const roomManager = new RoomManager();
    roomManager.createRoom(ROOM_ID, {
      playerId: HOST_ID,
      displayName: "Host",
      characterSelection: HOST_SELECTION,
    });
    const service = new StartGameService(roomManager, new GameSessionManager(), {
      create: () => {
        throw new Error("Factory must not be invoked");
      },
    });

    expect(() => service.start("player-guest" as PlayerId)).toThrow("Only the room host");
  });
});

/** 创建仅供开始服务测试读取公开快照的最小玩家状态。 */
function createPlayerSessionState(playerId: PlayerId) {
  return {
    playerId,
    character: {
      playerId,
      gender: "female",
      identityId: "identity.mage",
      raceId: "race.human",
    },
    map: { currentTileId: "tile:1" },
  };
}
