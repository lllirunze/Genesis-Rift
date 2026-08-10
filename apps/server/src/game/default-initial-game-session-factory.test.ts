import { describe, expect, it } from "vitest";
import type { PlayerId } from "@genesis-rift/shared";

import { DefaultInitialGameSessionFactory } from "./default-initial-game-session-factory.ts";

const PLAYER_ONE = "player-one" as PlayerId;
const PLAYER_TWO = "player-two" as PlayerId;

describe("DefaultInitialGameSessionFactory", () => {
  it("creates complete player state, shared decks, and two initial hand cards per player", () => {
    const result = new DefaultInitialGameSessionFactory().create({
      roomId: "room-local-001",
      players: [
        {
          playerId: PLAYER_ONE,
          displayName: "Player One",
          characterSelection: { gender: "female", identityName: "mage", raceName: "human" },
        },
        {
          playerId: PLAYER_TWO,
          displayName: "Player Two",
          characterSelection: { gender: "female", identityName: "demon", raceName: "yokai" },
        },
      ],
    });

    expect(result.state.status).toBe("lobby");
    expect(result.state.players).toHaveLength(2);
    expect(result.state.players.every((player) => player.hand.handCardIds.length === 2)).toBe(true);
    expect(result.state.world.handCardDeck.drawPile).toHaveLength(20);
    expect(
      result.state.players.every((player) => {
        const tile = result.state.world.map.getTileById(player.map.currentTileId);
        return tile !== undefined && tile.ring >= 8 && tile.ring <= 10;
      }),
    ).toBe(true);
    expect(result.state.players[0]?.character.identityId).toBe("identity.mage");
    expect(result.state.players[1]?.character.raceId).toBe("race.yokai");
    expect(result.state.players[1]?.character.gender).toBe("female");
  });
});
