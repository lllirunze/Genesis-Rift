import { advanceStatusDurationAtTurnEnd } from "./advance-status-duration.ts";
import { applyStatus, type StatusApplicationOutcome } from "./apply-status.ts";
import { removeStatusStacks } from "./remove-status-stacks.ts";
import type { StatusDefinition, StatusDefinitionCatalog, StatusKind } from "./status-definition.ts";
import { validateStatusDefinition } from "./status-definition.ts";
import {
  createStatusInstance,
  validateStatusInstance,
  type StatusInstance,
} from "./status-instance.ts";

export interface CharacterStatusState {
  readonly targetId: string;
  readonly instances: readonly StatusInstance[];
}

export interface ApplyStatusToCharacterInput {
  readonly definitionId: string;
  readonly newInstanceId: string;
  readonly sourceId: string;
  readonly createdAtSequence: number;
}

export interface ApplyStatusToCharacterResult {
  readonly state: CharacterStatusState;
  readonly instance: StatusInstance;
  readonly outcome: StatusApplicationOutcome;
  readonly created: boolean;
  readonly previousStacks: number;
  readonly addedStacks: 0 | 1;
}

export interface AdvanceCharacterStatusesResult {
  readonly state: CharacterStatusState;
  readonly ticked: readonly StatusInstance[];
  readonly expired: readonly StatusInstance[];
}

export type StatusDispelOutcome = "dispelled" | "protected" | "not_found";

export interface DispelStatusResult {
  readonly state: CharacterStatusState;
  readonly outcome: StatusDispelOutcome;
  readonly instance: StatusInstance | null;
}

export interface RemoveCharacterStatusStacksResult {
  readonly state: CharacterStatusState;
  readonly outcome: "unchanged" | "reduced" | "removed" | "not_found";
  readonly instance: StatusInstance | null;
  readonly removedStacks: number;
}

export interface RemoveStatusesOnDeathResult {
  readonly state: CharacterStatusState;
  readonly removed: readonly StatusInstance[];
  readonly retained: readonly StatusInstance[];
}

export function createCharacterStatusState(targetId: string): CharacterStatusState {
  assertNonEmptyString(targetId, "targetId");

  return {
    targetId,
    instances: [],
  };
}

export function validateCharacterStatusState(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
): void {
  assertNonEmptyString(state.targetId, "targetId");
  const instanceIds = new Set<string>();
  const definitionIds = new Set<string>();

  for (const instance of state.instances) {
    if (instanceIds.has(instance.instanceId)) {
      throw new Error(`Duplicate status instance id: ${instance.instanceId}`);
    }

    if (definitionIds.has(instance.definitionId)) {
      throw new Error(`Duplicate active status definition: ${instance.definitionId}`);
    }

    if (instance.targetId !== state.targetId) {
      throw new Error(`Status instance does not belong to target: ${instance.instanceId}`);
    }

    const definition = getStatusDefinition(definitions, instance.definitionId);
    validateStatusInstance(instance, definition);

    if (instance.currentStacks === 0 || instance.remainingTurns === 0) {
      throw new Error(
        `Character status collection contains an inactive instance: ${instance.instanceId}`,
      );
    }

    instanceIds.add(instance.instanceId);
    definitionIds.add(instance.definitionId);
  }
}

export function applyStatusToCharacter(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
  input: ApplyStatusToCharacterInput,
): ApplyStatusToCharacterResult {
  validateCharacterStatusState(state, definitions);
  assertNonEmptyString(input.newInstanceId, "newInstanceId");
  assertNonEmptyString(input.sourceId, "sourceId");
  assertNonNegativeSafeInteger(input.createdAtSequence, "createdAtSequence");
  const definition = getStatusDefinition(definitions, input.definitionId);
  const existingIndex = state.instances.findIndex(
    (instance) => instance.definitionId === input.definitionId,
  );
  const created = existingIndex === -1;

  if (created && state.instances.some((instance) => instance.instanceId === input.newInstanceId)) {
    throw new Error(`Duplicate status instance id: ${input.newInstanceId}`);
  }

  const previousInstance = created
    ? createStatusInstance({
        instanceId: input.newInstanceId,
        definition,
        sourceId: input.sourceId,
        targetId: state.targetId,
        createdAtSequence: input.createdAtSequence,
      })
    : state.instances[existingIndex]!;
  const application = applyStatus(previousInstance, definition);
  const instances = created
    ? [...state.instances, application.instance]
    : state.instances.map((instance, index) =>
        index === existingIndex ? application.instance : instance,
      );

  return {
    state: { ...state, instances },
    instance: application.instance,
    outcome: application.outcome,
    created,
    previousStacks: application.previousStacks,
    addedStacks: application.addedStacks,
  };
}

export function advanceCharacterStatusesAtTurnEnd(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
): AdvanceCharacterStatusesResult {
  validateCharacterStatusState(state, definitions);
  const instances: StatusInstance[] = [];
  const ticked: StatusInstance[] = [];
  const expired: StatusInstance[] = [];

  for (const instance of state.instances) {
    const definition = getStatusDefinition(definitions, instance.definitionId);
    const result = advanceStatusDurationAtTurnEnd(instance, definition, state.targetId);

    if (result.instance === null) {
      expired.push(instance);
      continue;
    }

    instances.push(result.instance);

    if (result.outcome === "ticked") {
      ticked.push(result.instance);
    }
  }

  return {
    state: { ...state, instances },
    ticked,
    expired,
  };
}

export function removeCharacterStatusStacks(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
  instanceId: string,
  amount: number,
): RemoveCharacterStatusStacksResult {
  validateCharacterStatusState(state, definitions);
  const index = state.instances.findIndex((instance) => instance.instanceId === instanceId);

  if (index === -1) {
    return {
      state,
      outcome: "not_found",
      instance: null,
      removedStacks: 0,
    };
  }

  const previousInstance = state.instances[index]!;
  const definition = getStatusDefinition(definitions, previousInstance.definitionId);
  const result = removeStatusStacks(previousInstance, definition, amount);
  const instances =
    result.instance === null
      ? state.instances.filter((_, currentIndex) => currentIndex !== index)
      : state.instances.map((instance, currentIndex) =>
          currentIndex === index ? result.instance! : instance,
        );

  return {
    state: { ...state, instances },
    outcome: result.outcome,
    instance: result.instance,
    removedStacks: result.removedStacks,
  };
}

export function dispelCharacterStatus(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
  instanceId: string,
): DispelStatusResult {
  validateCharacterStatusState(state, definitions);
  const instance = state.instances.find((candidate) => candidate.instanceId === instanceId);

  if (instance === undefined) {
    return { state, outcome: "not_found", instance: null };
  }

  const definition = getStatusDefinition(definitions, instance.definitionId);

  if (!definition.removal.dispellable) {
    return { state, outcome: "protected", instance };
  }

  return {
    state: {
      ...state,
      instances: state.instances.filter((candidate) => candidate.instanceId !== instanceId),
    },
    outcome: "dispelled",
    instance,
  };
}

export function removeCharacterStatusesOnDeath(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
): RemoveStatusesOnDeathResult {
  validateCharacterStatusState(state, definitions);
  const removed: StatusInstance[] = [];
  const retained: StatusInstance[] = [];

  for (const instance of state.instances) {
    const definition = getStatusDefinition(definitions, instance.definitionId);
    const destination = definition.removal.removeOnDeath ? removed : retained;
    destination.push(instance);
  }

  return {
    state: { ...state, instances: retained },
    removed,
    retained,
  };
}

export function getCharacterStatusByInstanceId(
  state: CharacterStatusState,
  instanceId: string,
): StatusInstance | null {
  return state.instances.find((instance) => instance.instanceId === instanceId) ?? null;
}

export function getCharacterStatusesByKind(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
  kind: StatusKind,
): readonly StatusInstance[] {
  validateCharacterStatusState(state, definitions);

  return state.instances.filter(
    (instance) => getStatusDefinition(definitions, instance.definitionId).kind === kind,
  );
}

export function getCharacterStatusesByTag(
  state: CharacterStatusState,
  definitions: StatusDefinitionCatalog,
  tag: string,
): readonly StatusInstance[] {
  validateCharacterStatusState(state, definitions);
  assertNonEmptyString(tag, "tag");

  return state.instances.filter((instance) =>
    getStatusDefinition(definitions, instance.definitionId).tags.includes(tag),
  );
}

function getStatusDefinition(
  definitions: StatusDefinitionCatalog,
  definitionId: string,
): StatusDefinition {
  const definition = definitions[definitionId];

  if (definition === undefined) {
    throw new Error(`Missing status definition: ${definitionId}`);
  }

  validateStatusDefinition(definition);
  return definition;
}

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
