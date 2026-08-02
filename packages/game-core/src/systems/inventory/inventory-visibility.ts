import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import { BACKPACK_GRID_HEIGHT, BACKPACK_GRID_WIDTH } from "./backpack-config.ts";
import { getBackpackUsableArea, type BackpackLevel } from "./backpack-definition.ts";
import { getItemDefinition } from "./backpack-geometry.ts";
import type { BackpackEntry, BackpackPosition, BackpackState } from "./backpack-state.ts";
import { validateBackpackState } from "./validate-backpack-state.ts";

/** 描述当前模块对外公开的业务数据契约。 */
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

/** 描述当前模块对外公开的业务数据契约。 */
export interface FullBackpackView extends BackpackViewBase {
  readonly visibility: "full";
  readonly revealGrantId: string | null;
  readonly entries: readonly BackpackEntry[];
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface MaskedBackpackEntry {
  readonly maskId: string;
  readonly position: BackpackPosition;
  readonly width: number;
  readonly height: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface MaskedBackpackView extends BackpackViewBase {
  readonly visibility: "masked";
  readonly entries: readonly MaskedBackpackEntry[];
}

/** 描述当前模块对外公开的业务数据契约。 */
export type BackpackView = FullBackpackView | MaskedBackpackView;

/** 描述当前模块对外公开的业务数据契约。 */
export interface CreateBackpackViewInput {
  readonly backpack: BackpackState;
  readonly viewerPlayerId: PlayerId;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly currentSequence: number;
  readonly revealGrants?: readonly BackpackRevealGrant[];
}

/**
 * 方法名：createBackpackView
 * 作用：创建并校验该方法所负责的业务对象。
 * @param input 本次处理的输入数据。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：findActiveBackpackRevealGrant
 * 作用：读取并返回符合条件的业务数据，不修改输入状态。
 * @param grants 方法所需的 grants 参数。
 * @param ownerPlayerId 方法所需的 ownerPlayerId 参数。
 * @param viewerPlayerId 方法所需的 viewerPlayerId 参数。
 * @param currentSequence 方法所需的 currentSequence 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：validateBackpackRevealGrant
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param grant 方法所需的 grant 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
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

/**
 * 方法名：cloneBackpackEntries
 * 作用：执行该方法负责的单一业务操作。
 * @param entries 方法所需的 entries 参数。
 * @returns 本次处理得到的结果。
 */
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

/**
 * 方法名：createMaskId
 * 作用：创建并校验该方法所负责的业务对象。
 * @param position 方法所需的 position 参数。
 * @returns 本次处理得到的结果。
 */
function createMaskId(position: BackpackPosition): string {
  return `mask-${position.x}-${position.y}`;
}

/**
 * 方法名：assertNonNegativeSafeInteger
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
