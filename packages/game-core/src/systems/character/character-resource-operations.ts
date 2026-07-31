import type { CharacterResourceState, CharacterResourceValue } from "./character-resource-state.ts";
import { getCharacterResource } from "./character-resource-state.ts";

export interface CharacterResourceChangeResult<ResourceId extends string> {
  readonly state: CharacterResourceState<ResourceId>;
  readonly resource: CharacterResourceValue;
  readonly requestedAmount: number;
  readonly appliedAmount: number;
}

export function increaseCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  amount: number,
): CharacterResourceChangeResult<ResourceId> {
  assertNonNegativeSafeInteger(amount, "amount");
  const previous = getCharacterResource(state, resourceId);
  const appliedAmount = Math.min(amount, previous.maximum - previous.current);

  return updateCharacterResource(state, resourceId, previous.current + appliedAmount, {
    requestedAmount: amount,
    appliedAmount,
  });
}

export function decreaseCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  amount: number,
): CharacterResourceChangeResult<ResourceId> {
  assertNonNegativeSafeInteger(amount, "amount");
  const previous = getCharacterResource(state, resourceId);
  const appliedAmount = Math.min(amount, previous.current - previous.minimum);

  return updateCharacterResource(state, resourceId, previous.current - appliedAmount, {
    requestedAmount: amount,
    appliedAmount,
  });
}

export function spendCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  amount: number,
): CharacterResourceChangeResult<ResourceId> {
  assertNonNegativeSafeInteger(amount, "amount");
  const previous = getCharacterResource(state, resourceId);
  const available = previous.current - previous.minimum;

  if (amount > available) {
    throw new RangeError(
      `Insufficient character resource ${resourceId}: required ${amount}, available ${available}`,
    );
  }

  return updateCharacterResource(state, resourceId, previous.current - amount, {
    requestedAmount: amount,
    appliedAmount: amount,
  });
}

export function setCharacterResourceCurrentValue<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  value: number,
): CharacterResourceChangeResult<ResourceId> {
  assertSafeInteger(value, "value");
  const previous = getCharacterResource(state, resourceId);
  const current = Math.min(Math.max(value, previous.minimum), previous.maximum);

  return updateCharacterResource(state, resourceId, current, {
    requestedAmount: Math.abs(current - previous.current),
    appliedAmount: Math.abs(current - previous.current),
  });
}

export function isCharacterResourceDepleted<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
): boolean {
  const resource = getCharacterResource(state, resourceId);
  return resource.current === resource.minimum;
}

function updateCharacterResource<ResourceId extends string>(
  state: CharacterResourceState<ResourceId>,
  resourceId: ResourceId,
  current: number,
  change: Pick<CharacterResourceChangeResult<ResourceId>, "requestedAmount" | "appliedAmount">,
): CharacterResourceChangeResult<ResourceId> {
  const previous = getCharacterResource(state, resourceId);
  const resource = { ...previous, current };

  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        [resourceId]: resource,
      },
    },
    resource,
    ...change,
  };
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  assertSafeInteger(value, field);

  if (value < 0) {
    throw new RangeError(`${field} must not be negative`);
  }
}

function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
}
