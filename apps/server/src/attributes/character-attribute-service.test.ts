import { describe, expect, it } from "vitest";

import {
  applyStatusToCharacter,
  createCharacterStatusState,
  createEmptyEquipmentLoadout,
  createEquipmentInstance,
  equipEquipment,
  type CharacterState,
  type EquipmentDefinition,
} from "@genesis-rift/game-core";
import {
  DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
  STATUS_DEFINITION_CATALOG,
  VITALITY_BLESSING_STATUS_DEFINITION,
} from "@genesis-rift/game-data";
import type { PlayerId } from "@genesis-rift/shared";

import { Logger, LogRecordFactory, type LogWriter } from "../logging/index.ts";
import { CharacterAttributeService } from "./character-attribute-service.ts";

const PLAYER_ID = "player-1" as PlayerId;

const WIND_BOOTS: EquipmentDefinition = {
  definitionId: "equipment.wind-boots",
  name: "Wind Boots",
  type: "shoes",
  quality: "rare",
  corePosition: "Improves agility and movement range.",
  allowDuplicateEquipping: false,
  attributeEffects: [
    {
      effectId: "agility",
      targetType: "primary",
      targetAttribute: "agility",
      value: 1,
    },
    {
      effectId: "movement-range",
      targetType: "derived",
      targetAttribute: "movementRange",
      value: 2,
    },
  ],
};

const EQUIPMENT_DEFINITIONS = {
  [WIND_BOOTS.definitionId]: WIND_BOOTS,
};

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  async write(line: string): Promise<void> {
    this.lines.push(line);
  }

  async close(): Promise<void> {}
}

function createFixture() {
  const writer = new MemoryLogWriter();
  const timestamp = new Date(2026, 7, 1, 12, 30, 15, 21).getTime();
  const logger = new Logger({
    writer,
    recordFactory: new LogRecordFactory({ now: () => timestamp }),
  });

  return {
    logger,
    service: new CharacterAttributeService(
      DERIVED_ATTRIBUTE_FORMULA_CONFIGS,
      EQUIPMENT_DEFINITIONS,
      STATUS_DEFINITION_CATALOG,
      logger,
    ),
    writer,
  };
}

function createCharacter(): CharacterState {
  return {
    playerId: PLAYER_ID,
    identityId: "identity.test",
    raceId: "race.test",
    currentPrimaryAttributes: {
      strength: 5,
      constitution: 5,
      spirit: 5,
      agility: 5,
      insight: 5,
    },
    attributeModifiers: [
      {
        modifierId: "growth.strength",
        sourceId: "growth-1",
        sourceType: "growth",
        targetType: "primary",
        targetAttribute: "strength",
        value: 1,
      },
    ],
    levelProgression: {
      currentLevel: 1,
      currentExperience: 0,
    },
  };
}

function createEquippedLoadout(playerId: PlayerId = PLAYER_ID) {
  const equipment = createEquipmentInstance({
    instanceId: "equipment-instance-1",
    definitionId: WIND_BOOTS.definitionId,
    ownerPlayerId: playerId,
  });

  return equipEquipment(createEmptyEquipmentLoadout(playerId), "shoes", equipment, WIND_BOOTS)
    .loadout;
}

function createActiveStatusState() {
  return applyStatusToCharacter(createCharacterStatusState(PLAYER_ID), STATUS_DEFINITION_CATALOG, {
    definitionId: VITALITY_BLESSING_STATUS_DEFINITION.definitionId,
    newInstanceId: "status-instance-1",
    sourceId: "skill.vitality-blessing",
    createdAtSequence: 1,
  }).state;
}

describe("CharacterAttributeService", () => {
  it("builds one snapshot from character, equipment, status, and additional sources", async () => {
    const fixture = createFixture();
    const result = fixture.service.createSnapshot({
      playerId: PLAYER_ID,
      playerName: "Runze",
      character: createCharacter(),
      equipmentLoadout: createEquippedLoadout(),
      statusState: createActiveStatusState(),
      additionalModifierSources: [
        {
          sourceName: "weather",
          modifiers: [
            {
              modifierId: "weather.storm.movement-range",
              sourceId: "weather.storm",
              sourceType: "weather",
              targetType: "derived",
              targetAttribute: "movementRange",
              value: -1,
            },
          ],
        },
      ],
    });
    await fixture.logger.flush();

    expect(result.modifierCounts).toEqual({
      character: 1,
      equipment: 2,
      status: 2,
      additional: 1,
      total: 6,
    });
    expect(result.snapshot.effectivePrimaryAttributes).toEqual({
      strength: 6,
      constitution: 6,
      spirit: 5,
      agility: 6,
      insight: 5,
    });
    expect(result.snapshot.derivedDynamicOffset).toEqual({
      movementRange: 1,
      healthRegeneration: 1,
    });
    expect(result.snapshot.derivedAttributes).toEqual({
      maxHealth: 98,
      healthRegeneration: 3,
      movementRange: 4,
    });
    expect(fixture.writer.lines[0]).toContain("Generated unified character attribute snapshot.");
  });

  it("supports an empty list of future modifier sources", () => {
    const fixture = createFixture();
    const result = fixture.service.createSnapshot({
      playerId: PLAYER_ID,
      playerName: "Runze",
      character: createCharacter(),
      equipmentLoadout: createEmptyEquipmentLoadout(PLAYER_ID),
      statusState: createCharacterStatusState(PLAYER_ID),
    });

    expect(result.modifierCounts).toEqual({
      character: 1,
      equipment: 0,
      status: 0,
      additional: 0,
      total: 1,
    });
  });

  it("rejects ownership mismatches and logs the failure", async () => {
    const fixture = createFixture();
    const anotherPlayerId = "player-2" as PlayerId;

    expect(() =>
      fixture.service.createSnapshot({
        playerId: PLAYER_ID,
        playerName: "Runze",
        character: createCharacter(),
        equipmentLoadout: createEquippedLoadout(anotherPlayerId),
        statusState: createCharacterStatusState(PLAYER_ID),
      }),
    ).toThrow("same player");
    await fixture.logger.flush();

    expect(fixture.writer.lines[0]).toContain("[ERROR]");
    expect(fixture.writer.lines[0]).toContain("Character attribute snapshot generation failed.");
  });

  it("rejects duplicate additional source groups", async () => {
    const fixture = createFixture();

    expect(() =>
      fixture.service.createSnapshot({
        playerId: PLAYER_ID,
        playerName: "Runze",
        character: createCharacter(),
        equipmentLoadout: createEmptyEquipmentLoadout(PLAYER_ID),
        statusState: createCharacterStatusState(PLAYER_ID),
        additionalModifierSources: [
          { sourceName: "weather", modifiers: [] },
          { sourceName: "weather", modifiers: [] },
        ],
      }),
    ).toThrow("Duplicate additional attribute modifier source");
    await fixture.logger.flush();

    expect(fixture.writer.lines).toHaveLength(1);
    expect(fixture.writer.lines[0]).toContain("[ERROR]");
  });
});
