import type { EventDefinition, EventDefinitionCatalog } from "./event-definition.ts";
import type { EventPoolDefinition } from "./event-pool-definition.ts";

/** 描述合并事件池后尚未进行触发条件筛选的事件候选。 */
export interface EventPoolCandidate {
  readonly event: EventDefinition;
  readonly sourcePoolIds: readonly string[];
  readonly weightAdjustment: number;
  readonly currentWeight: number;
}

/**
 * 方法名：collectEventPoolCandidates
 * 作用：合并多个事件池、按照事件标识去重并计算候选事件当前权重。
 * @param pools 本次触发共同参与的事件池。
 * @param eventCatalog 事件池引用的事件定义注册表。
 * @returns 按首次出现顺序排列且不包含重复事件的候选集合。
 * @throws 事件池引用未知事件或权重计算超出安全整数范围时抛出错误。
 */
export function collectEventPoolCandidates(
  pools: readonly EventPoolDefinition[],
  eventCatalog: EventDefinitionCatalog,
): readonly EventPoolCandidate[] {
  const candidatesByEventId = new Map<
    string,
    {
      readonly event: EventDefinition;
      readonly sourcePoolIds: string[];
      weightAdjustment: number;
    }
  >();

  for (const pool of pools) {
    for (const entry of pool.entries) {
      const event = eventCatalog[entry.eventId];

      if (event === undefined) {
        throw new Error(`Event pool ${pool.poolId} references unknown event: ${entry.eventId}`);
      }

      const existingCandidate = candidatesByEventId.get(entry.eventId);

      if (existingCandidate === undefined) {
        candidatesByEventId.set(entry.eventId, {
          event,
          sourcePoolIds: [pool.poolId],
          weightAdjustment: entry.weightAdjustment,
        });
        continue;
      }

      if (!existingCandidate.sourcePoolIds.includes(pool.poolId)) {
        existingCandidate.sourcePoolIds.push(pool.poolId);
      }

      existingCandidate.weightAdjustment = Math.max(
        existingCandidate.weightAdjustment,
        entry.weightAdjustment,
      );
    }
  }

  return [...candidatesByEventId.values()].map((candidate) => {
    const adjustedWeight = candidate.event.baseWeight + candidate.weightAdjustment;

    if (!Number.isSafeInteger(adjustedWeight)) {
      throw new RangeError(`Event weight must remain a safe integer: ${candidate.event.eventId}`);
    }

    return {
      event: candidate.event,
      sourcePoolIds: candidate.sourcePoolIds,
      weightAdjustment: candidate.weightAdjustment,
      currentWeight: Math.max(0, adjustedWeight),
    };
  });
}
