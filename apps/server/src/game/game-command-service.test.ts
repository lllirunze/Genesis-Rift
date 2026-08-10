import { describe, expect, it } from "vitest";
import type { GameSessionState, GameSessionValidationContext } from "@genesis-rift/game-core";
import type { GameId, PlayerId } from "@genesis-rift/shared";

import { GameCommandService } from "./game-command-service.ts";
import { ServerGameSession } from "./game-session.ts";
import { Logger, type LogWriter } from "../logging/index.ts";

const GAME_ID = "game_000001" as GameId;
const PLAYER_ID = "player-one" as PlayerId;

describe("GameCommandService", () => {
  it("dispatches turn.end through the authority session", () => {
    const state = {
      version: 4,
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

  it("writes a Battle log entry when a normal attack resolves", async () => {
    const writer = new MemoryLogWriter();
    const logger = new Logger({ writer });
    const session = {
      attackActivePlayer: () => ({
        events: [
          {
            type: "battle.attackResolved" as const,
            gameId: GAME_ID,
            attackId: "attack:game_000001:1",
            attackerId: PLAYER_ID,
            defenderId: "player-two" as PlayerId,
            outcome: "RESOLVED" as const,
            finalDamage: 12,
            defenderHealth: 78,
            defenderShield: 0,
            defenderSurvivalStatus: "ACTIVE",
          },
        ],
        snapshot: {} as never,
      }),
    } as unknown as ServerGameSession;
    const service = new GameCommandService(session, logger);

    service.execute({
      commandId: "command-attack-001",
      playerId: PLAYER_ID,
      type: "battle.attack",
      targetPlayerId: "player-two" as PlayerId,
    });
    await logger.flush();

    expect(writer.lines).toHaveLength(1);
    expect(writer.lines[0]).toContain("[Battle  ][GameCommandService]");
    expect(writer.lines[0]).toContain(
      "Player player-one attacked player-two with resolved outcome.",
    );
  });

  it("writes an Item log entry after a successful inventory command", async () => {
    const writer = new MemoryLogWriter();
    const logger = new Logger({ writer });
    const session = {
      moveInventoryItem: () => ({ events: [], snapshot: {} as never }),
    } as unknown as ServerGameSession;
    const service = new GameCommandService(session, logger);

    service.execute({
      commandId: "command-item-001",
      playerId: PLAYER_ID,
      type: "inventory.move",
      itemInstanceId: "item-instance-001",
      targetPosition: { x: 1, y: 2 },
    });
    await logger.flush();

    expect(writer.lines).toHaveLength(1);
    expect(writer.lines[0]).toContain("[Item    ][GameCommandService]");
    expect(writer.lines[0]).toContain("Player completed inventory.move command successfully.");
  });
});

/** 提供仅用于命令服务日志断言的内存日志写入器。 */
class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  /**
   * 方法名：write
   * 作用：记录统一日志格式化后的单行文本。
   * @param line 需要保存的日志文本。
   * @returns 写入完成的异步结果。
   */
  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  /**
   * 方法名：close
   * 作用：实现日志写入器释放接口；内存测试实现无需额外清理。
   * @returns 关闭完成的异步结果。
   */
  async close(): Promise<void> {}
}

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
