import { describe, expect, it } from "vitest";
import type { GameSessionState, GameSessionValidationContext } from "@genesis-rift/game-core";
import type { GameId, PlayerId } from "@genesis-rift/shared";

import { GameCommandService } from "./game-command-service.ts";
import { ServerGameSession } from "./game-session.ts";

const GAME_ID = "game_000001" as GameId;
const PLAYER_ID = "player-one" as PlayerId;

describe("GameCommandService", () => {
  it("dispatches turn.end through the authority session", () => {
    const state = {
      version: 2,
      gameId: GAME_ID,
      status: "lobby",
      playerOrder: [PLAYER_ID],
      players: [createPlayerSessionState(PLAYER_ID)],
      world: {},
      random: {},
    } as unknown as GameSessionState;
    const session = new ServerGameSession(state, {} as GameSessionValidationContext);
    session.start();
    const service = new GameCommandService(session);
    const result = service.execute({
      commandId: "command-001",
      playerId: PLAYER_ID,
      type: "turn.end",
    });

    expect(result.commandId).toBe("command-001");
    expect(result.snapshot.turn.globalTurn).toBe(1);
  });
});

/** 创建仅供命令服务测试读取公开快照的最小玩家状态。 */
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
