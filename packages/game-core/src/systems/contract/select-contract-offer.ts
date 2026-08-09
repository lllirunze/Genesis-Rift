import type { RandomStream } from "../random/core/random-stream.ts";
import { pickWeightedItem } from "../random/policy/weighted-random-policy.ts";
import {
  validateContractDefinitionCatalog,
  type ContractDefinition,
  type ContractDefinitionCatalog,
} from "./contract-definition.ts";
import {
  offerContract,
  validateDivineContractState,
  type DivineContractState,
} from "./contract-runtime-state.ts";

/** 描述一次契约机会筛选所需的世界阶段与触发场景标签。 */
export interface ContractOfferSelectionContext {
  readonly worldStageId: string;
  readonly triggerTags: readonly string[];
}

/** 描述自动抽取并写入私有待处理机会后的结果。 */
export interface OfferRandomContractResult {
  readonly state: DivineContractState;
  readonly contractId: string | null;
}

/**
 * 方法名：filterEligibleContractDefinitions
 * 作用：按世界阶段、触发标签和正整数权重筛选可以提供的契约资源。
 * @param catalog 已校验的契约资源注册表。
 * @param context 当前世界状态与触发来源上下文。
 * @returns 保持注册表原有顺序的合法契约资源集合。
 * @throws 世界阶段或触发标签为空、重复时抛出错误。
 */
export function filterEligibleContractDefinitions(
  catalog: ContractDefinitionCatalog,
  context: ContractOfferSelectionContext,
): readonly ContractDefinition[] {
  validateContractDefinitionCatalog(catalog);
  validateContractOfferSelectionContext(context);

  return Object.freeze(
    Object.values(catalog).filter(
      (definition) =>
        definition.baseWeight > 0 &&
        definition.allowedWorldStageIds.includes(context.worldStageId) &&
        definition.triggerTags.some((tag) => context.triggerTags.includes(tag)),
    ),
  );
}

/**
 * 方法名：selectContractOffer
 * 作用：从符合当前世界阶段和触发场景的契约资源中按整数权重抽取一项。
 * @param randomStream 本次抽取使用的独立契约随机流。
 * @param catalog 已校验的契约资源注册表。
 * @param context 当前世界状态与触发来源上下文。
 * @returns 抽中的契约资源；没有合法候选时返回 null。
 * @throws 使用非契约随机流时抛出错误。
 */
export function selectContractOffer(
  randomStream: RandomStream,
  catalog: ContractDefinitionCatalog,
  context: ContractOfferSelectionContext,
): ContractDefinition | null {
  if (randomStream.streamType !== "contract") {
    throw new Error(
      `Contract selection requires a contract random stream: ${randomStream.streamType}`,
    );
  }

  const candidates = filterEligibleContractDefinitions(catalog, context);

  if (candidates.length === 0) {
    return null;
  }

  return pickWeightedItem(
    randomStream,
    candidates.map((definition) => ({ item: definition, weight: definition.baseWeight })),
  );
}

/**
 * 方法名：offerRandomContract
 * 作用：为符合资格的玩家自动筛选、加权抽取并写入一条私有待处理契约机会。
 * @param state 当前玩家私有契约状态。
 * @param catalog 已校验的契约资源注册表。
 * @param opportunityId 本次契约机会的运行时唯一标识。
 * @param randomStream 本次抽取使用的独立契约随机流。
 * @param context 当前世界状态与触发来源上下文。
 * @returns 最新私有契约状态及被提供的契约资源标识；未提供时标识为 null。
 * @throws 机会标识为空或随机流类型错误时抛出错误。
 */
export function offerRandomContract(
  state: DivineContractState,
  catalog: ContractDefinitionCatalog,
  opportunityId: string,
  randomStream: RandomStream,
  context: ContractOfferSelectionContext,
): OfferRandomContractResult {
  validateDivineContractState(state, catalog);
  assertNonEmptyString(opportunityId, "opportunityId");

  if (state.hasSigned || state.pendingOffer !== null) {
    return Object.freeze({ state, contractId: null });
  }

  if (state.offerHistory.some((entry) => entry.opportunityId === opportunityId)) {
    throw new Error(`Divine contract opportunity has already been used: ${opportunityId}`);
  }

  const definition = selectContractOffer(randomStream, catalog, context);

  if (definition === null) {
    return Object.freeze({ state, contractId: null });
  }

  const offeredState = offerContract(state, catalog, opportunityId, definition.contractId);
  return Object.freeze({ state: offeredState, contractId: definition.contractId });
}

/** 校验契约机会筛选上下文中的世界阶段和标签集合。 */
function validateContractOfferSelectionContext(context: ContractOfferSelectionContext): void {
  assertNonEmptyString(context.worldStageId, "worldStageId");
  const tags = new Set<string>();

  for (const tag of context.triggerTags) {
    assertNonEmptyString(tag, "triggerTags");

    if (tags.has(tag)) {
      throw new Error(`Duplicate contract trigger tag: ${tag}`);
    }

    tags.add(tag);
  }
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
