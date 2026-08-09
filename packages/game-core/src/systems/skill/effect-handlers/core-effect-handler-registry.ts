import { SkillEffectHandlerRegistry } from "../skill-effect-handler.ts";
import {
  createSkillAttackEffectHandler,
  createSkillForcedDisplacementEffectHandler,
  createSkillResourceRestoreEffectHandler,
  createSkillShieldGrantEffectHandler,
  createSkillStatusAddEffectHandler,
  type CoreSkillEffectHandlerDependencies,
} from "./core-skill-effect-handlers.ts";

/**
 * 方法名：createCoreSkillEffectHandlerRegistry
 * 作用：创建并注册 V1 全部基础技能效果类型的标准处理器集合。
 * @param dependencies 战斗、状态、资源、护盾和地图模块提供的业务入口。
 * @returns 已注册五类基础技能效果处理器的注册表。
 */
export function createCoreSkillEffectHandlerRegistry(
  dependencies: CoreSkillEffectHandlerDependencies,
): SkillEffectHandlerRegistry {
  const registry = new SkillEffectHandlerRegistry();
  registry.register(createSkillAttackEffectHandler(dependencies));
  registry.register(createSkillStatusAddEffectHandler(dependencies));
  registry.register(createSkillResourceRestoreEffectHandler(dependencies));
  registry.register(createSkillShieldGrantEffectHandler(dependencies));
  registry.register(createSkillForcedDisplacementEffectHandler(dependencies));
  return registry;
}
