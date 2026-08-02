import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { BACKPACK_GRID_HEIGHT, BACKPACK_GRID_WIDTH } from "./backpack-config.ts";
import { getBackpackUsableArea, type BackpackLevel } from "./backpack-definition.ts";
import { getItemDefinition } from "./backpack-geometry.ts";
import type { BackpackEntry, BackpackPosition, BackpackState } from "./backpack-state.ts";
import { validateBackpackState } from "./validate-backpack-state.ts";

export interface BackpackRevealGrant {
  readonly grantId: string;
  readonly sourceId: string;
  readonly ownerPlayerId: PlayerId;
  readonly viewerPlayerId: PlayerId;
  readonly validFromSequence: number;
  readonly validUntilSequence: number;
}

interface BackpackViewBase {
  readonly ownerPlayerId: PlayerId;
  readonly level: BackpackLevel;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly usableWidth: number;
  readonly usableHeight: number;
}

export interface FullBackpackView extends BackpackViewBase {
  readonly visibility: "full";
  readonly revealGrantId: string | null;
  readonly entries: readonly BackpackEntry[];
}

export interface MaskedBackpackEntry {
  readonly maskId: string;
  readonly position: BackpackPosition;
  readonly width: number;
  readonly height: number;
}

export interface MaskedBackpackView extends BackpackViewBase {
  readonly visibility: "masked";
  readonly entries: readonly MaskedBackpackEntry[];
}

export type BackpackView = FullBackpackView | MaskedBackpackView;

export interface CreateBackpackViewInput {
  readonly backpack: BackpackState;
  readonly viewerPlayerId: PlayerId;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly currentSequence: number;
  readonly revealGrants?: readonly BackpackRevealGrant[];
}

export function createBackpackView(input: CreateBackpackViewInput): BackpackView {
  validateBackpackState(input.backpack, input.itemDefinitions);
  assertNonNegativeSafeInteger(input.currentSequence, "currentSequence");
  const area = getBackpackUsableArea(input.backpack.level);
  const base = {
    ownerPlayerId: input.backpack.playerId,
    level: input.backpack.level,
    gridWidth: BACKPACK_GRID_WIDTH,
    gridHeight: BACKPACK_GRID_HEIGHT,
    usableWidth: area.width,
    usableHeight: area.height,
  };

  if (input.viewerPlayerId === input.backpack.playerId) {
    return Object.freeze({
      ...base,
      visibility: "full",
      revealGrantId: null,
      entries: cloneBackpackEntries(input.backpack.entries),
    });
  }

  const revealGrant = findActiveBackpackRevealGrant(
    input.revealGrants ?? [],
    input.backpack.playerId,
    input.viewerPlayerId,
    input.currentSequence,
  );

  if (revealGrant !== null) {
    return Object.freeze({
      ...base,
      visibility: "full",
      revealGrantId: revealGrant.grantId,
      entries: cloneBackpackEntries(input.backpack.entries),
    });
  }

  return Object.freeze({
    ...base,
    visibility: "masked",
    entries: Object.freeze(
      input.backpack.entries.map((entry) => {
        const definition = getItemDefinition(input.itemDefinitions, entry.item.definitionId);

        return Object.freeze({
          maskId: createMaskId(entry.position),
          position: Object.freeze({ ...entry.position }),
          width: definition.width,
          height: definition.height,
        });
      }),
    ),
  });
}

export function findActiveBackpackRevealGrant(
  grants: readonly BackpackRevealGrant[],
  ownerPlayerId: PlayerId,
  viewerPlayerId: PlayerId,
  currentSequence: number,
): BackpackRevealGrant | null {
  assertNonNegativeSafeInteger(currentSequence, "currentSequence");
  const grantIds = new Set<string>();
  let activeGrant: BackpackRevealGrant | null = null;

  for (const grant of grants) {
    validateBackpackRevealGrant(grant);

    if (grantIds.has(grant.grantId)) {
      throw new Error(`Duplicate backpack reveal grant: ${grant.grantId}`);
    }

    grantIds.add(grant.grantId);

    if (
      grant.ownerPlayerId === ownerPlayerId &&
      grant.viewerPlayerId === viewerPlayerId &&
      grant.validFromSequence <= currentSequence &&
      currentSequence <= grant.validUntilSequence
    ) {
      activeGrant ??= grant;
    }
  }

  return activeGrant;
}

export function validateBackpackRevealGrant(grant: BackpackRevealGrant): void {
  assertNonEmptyString(grant.grantId, "grantId");
  assertNonEmptyString(grant.sourceId, "sourceId");
  assertNonNegativeSafeInteger(grant.validFromSequence, "validFromSequence");
  assertNonNegativeSafeInteger(grant.validUntilSequence, "validUntilSequence");

  if (grant.ownerPlayerId === grant.viewerPlayerId) {
    throw new Error("Backpack owners do not require reveal grants");
  }

  if (grant.validUntilSequence < grant.validFromSequence) {
    throw new RangeError("Backpack reveal grant cannot expire before it starts");
  }
}

function cloneBackpackEntries(entries: readonly BackpackEntry[]): readonly BackpackEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        item: Object.freeze({ ...entry.item }),
        position: Object.freeze({ ...entry.position }),
      }),
    ),
  );
}

function createMaskId(position: BackpackPosition): string {
  return `mask-${position.x}-${position.y}`;
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
