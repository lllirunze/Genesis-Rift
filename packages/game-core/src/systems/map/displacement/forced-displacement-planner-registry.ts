import type { ForcedDisplacementDefinition } from "./forced-displacement-definition.ts";
import { validateForcedDisplacementDefinition } from "./forced-displacement-definition.ts";
import type {
  ForcedDisplacementPlan,
  ForcedDisplacementPlanner,
  ForcedDisplacementPlanningContext,
} from "./forced-displacement-planner.ts";

/** 统一保存并调用不同强制位移目标规划算法。 */
export class ForcedDisplacementPlannerRegistry {
  readonly #planners = new Map<string, ForcedDisplacementPlanner>();

  /**
   * 方法名：register
   * 作用：注册一种强制位移规划器，并禁止相同规划器标识重复注册。
   * @param planner 需要加入注册表的强制位移规划器。
   * @returns 无返回值。
   * @throws 规划器标识为空或已经存在时抛出错误。
   */
  register<Parameters extends Readonly<Record<string, unknown>>>(
    planner: ForcedDisplacementPlanner<Parameters>,
  ): void {
    assertNonEmptyString(planner.plannerId, "plannerId");

    if (this.#planners.has(planner.plannerId)) {
      throw new Error(`Duplicate forced displacement planner: ${planner.plannerId}`);
    }

    this.#planners.set(planner.plannerId, planner as ForcedDisplacementPlanner);
  }

  /**
   * 方法名：has
   * 作用：判断指定强制位移规划器是否已经注册。
   * @param plannerId 需要查询的规划器标识。
   * @returns 注册表包含目标规划器时返回 true。
   */
  has(plannerId: string): boolean {
    assertNonEmptyString(plannerId, "plannerId");
    return this.#planners.has(plannerId);
  }

  /**
   * 方法名：createPlan
   * 作用：根据定义中的规划器标识生成强制位移目标序列。
   * @param definition 当前强制位移静态定义。
   * @param context 规划器可以读取的地图与起始位置。
   * @returns 经过基础一致性校验的不可变强制位移计划。
   * @throws 定义非法、规划器缺失或规划结果标识不匹配时抛出错误。
   */
  createPlan(
    definition: ForcedDisplacementDefinition,
    context: ForcedDisplacementPlanningContext,
  ): ForcedDisplacementPlan {
    validateForcedDisplacementDefinition(definition);

    if (context.map.getTileById(context.originTileId) === undefined) {
      throw new Error(
        `Forced displacement planning origin does not exist: ${context.originTileId}`,
      );
    }

    const planner = this.#planners.get(definition.plannerId);

    if (planner === undefined) {
      throw new Error(`Missing forced displacement planner: ${definition.plannerId}`);
    }

    const plan = planner.createPlan(definition, context);

    if (plan.definitionId !== definition.definitionId) {
      throw new Error(
        `Forced displacement planner returned mismatched definition id: ${plan.definitionId}`,
      );
    }

    return Object.freeze({
      definitionId: plan.definitionId,
      targetCoordinates: Object.freeze(
        plan.targetCoordinates.map((coordinate) => ({ ...coordinate })),
      ),
    });
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验规划器标识包含有效内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
