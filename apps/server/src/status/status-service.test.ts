import { describe, expect, it } from "vitest";

import { createCharacterStatusState, type CharacterStatusState } from "@genesis-rift/game-core";
import {
  ARCANE_ACCUMULATION_STATUS_DEFINITION,
  EXHAUSTION_STATUS_DEFINITION,
  STATUS_DEFINITION_CATALOG,
  WIND_BLESSING_STATUS_DEFINITION,
} from "@genesis-rift/game-data";
import type { PlayerId } from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { StatusService } from "./status-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  async close(): Promise<void> {}
}

function createFixture(statusState = createCharacterStatusState(PLAYER_ID)) {
  const writer = new MemoryLogWriter();
  const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => timestamp }),
  });

  return {
    logger,
    service: new StatusService(STATUS_DEFINITION_CATALOG, logger),
    statusState,
    writer,
  };
}

function createContext(statusState: CharacterStatusState) {
  return {
    playerId: PLAYER_ID,
    playerName: "Runze",
    statusState,
  };
}

function applyDefinition(
  service: StatusService,
  statusState: CharacterStatusState,
  definitionId: string,
  sequence: number,
) {
  return service.applyStatus({
    ...createContext(statusState),
    definitionId,
    newInstanceId: `instance-${definitionId}`,
    sourceId: "skill.test",
    createdAtSequence: sequence,
  });
}

describe("StatusService", () => {
  it("applies and stacks statuses with structured business logs", async () => {
    const fixture = createFixture();
    const first = applyDefinition(
      fixture.service,
      fixture.statusState,
      ARCANE_ACCUMULATION_STATUS_DEFINITION.definitionId,
      1,
    );
    const second = applyDefinition(
      fixture.service,
      first.state,
      ARCANE_ACCUMULATION_STATUS_DEFINITION.definitionId,
      2,
    );
    await fixture.logger.flush();

    expect(first.outcome).toBe("applied");
    expect(second.outcome).toBe("stacked");
    expect(second.instance.currentStacks).toBe(2);
    expect(fixture.writer.lines).toHaveLength(2);
    expect(fixture.writer.lines[0]).toContain("Applied status status.arcane-accumulation.");
    expect(fixture.writer.lines[1]).toContain("Stacked status status.arcane-accumulation to 2.");
  });

  it("advances statuses each owner turn and logs expiration", async () => {
    const fixture = createFixture();
    const applied = applyDefinition(
      fixture.service,
      fixture.statusState,
      WIND_BLESSING_STATUS_DEFINITION.definitionId,
      1,
    );
    const firstTurn = fixture.service.advanceStatusesAtTurnEnd(createContext(applied.state));
    const secondTurn = fixture.service.advanceStatusesAtTurnEnd(createContext(firstTurn.state));
    const thirdTurn = fixture.service.advanceStatusesAtTurnEnd(createContext(secondTurn.state));
    await fixture.logger.flush();

    expect(firstTurn.state.instances[0]?.remainingTurns).toBe(2);
    expect(secondTurn.state.instances[0]?.remainingTurns).toBe(1);
    expect(thirdTurn.expired).toHaveLength(1);
    expect(thirdTurn.state.instances).toEqual([]);
    expect(fixture.writer.lines.some((line) => line.includes("status.wind-blessing expired"))).toBe(
      true,
    );
  });

  it("supports explicit stack removal and dispel rules", async () => {
    const fixture = createFixture();
    const arcaneFirst = applyDefinition(
      fixture.service,
      fixture.statusState,
      ARCANE_ACCUMULATION_STATUS_DEFINITION.definitionId,
      1,
    );
    const arcaneSecond = applyDefinition(
      fixture.service,
      arcaneFirst.state,
      ARCANE_ACCUMULATION_STATUS_DEFINITION.definitionId,
      2,
    );
    const reduced = fixture.service.removeStacks({
      ...createContext(arcaneSecond.state),
      instanceId: arcaneSecond.instance.instanceId,
      amount: 1,
    });
    const protectedResult = fixture.service.dispelStatus({
      ...createContext(reduced.state),
      instanceId: arcaneSecond.instance.instanceId,
    });
    const exhaustion = applyDefinition(
      fixture.service,
      protectedResult.state,
      EXHAUSTION_STATUS_DEFINITION.definitionId,
      3,
    );
    const dispelled = fixture.service.dispelStatus({
      ...createContext(exhaustion.state),
      instanceId: exhaustion.instance.instanceId,
    });
    await fixture.logger.flush();

    expect(reduced.instance?.currentStacks).toBe(1);
    expect(protectedResult.outcome).toBe("protected");
    expect(dispelled.outcome).toBe("dispelled");
    expect(dispelled.state.instances).toEqual([reduced.instance]);
    expect(fixture.writer.lines.some((line) => line.includes("could not be dispelled"))).toBe(true);
  });

  it("removes temporary statuses on death and retains permanent statuses", () => {
    const fixture = createFixture();
    const temporary = applyDefinition(
      fixture.service,
      fixture.statusState,
      EXHAUSTION_STATUS_DEFINITION.definitionId,
      1,
    );
    const permanent = applyDefinition(
      fixture.service,
      temporary.state,
      ARCANE_ACCUMULATION_STATUS_DEFINITION.definitionId,
      2,
    );
    const result = fixture.service.handleDeath(createContext(permanent.state));

    expect(result.removed).toEqual([temporary.instance]);
    expect(result.retained).toEqual([permanent.instance]);
    expect(result.state.instances).toEqual([permanent.instance]);
  });

  it("logs and rejects a status state belonging to another target", async () => {
    const fixture = createFixture(createCharacterStatusState("another-player"));

    expect(() =>
      applyDefinition(
        fixture.service,
        fixture.statusState,
        EXHAUSTION_STATUS_DEFINITION.definitionId,
        1,
      ),
    ).toThrow("same player");
    await fixture.logger.flush();

    expect(fixture.writer.lines).toHaveLength(1);
    expect(fixture.writer.lines[0]).toContain("[ERROR]");
    expect(fixture.writer.lines[0]).toContain("Status operation applyStatus failed.");
  });
});
