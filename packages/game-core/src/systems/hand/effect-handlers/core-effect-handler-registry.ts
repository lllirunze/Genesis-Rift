import { HandCardEffectHandlerRegistry } from "../hand-card-effect-handler-registry.ts";
import {
  createHandCardDrawEffectHandler,
  type HandCardDrawEffectHandlerDependencies,
} from "./hand-card-draw-effect-handler.ts";
import {
  createHealthRestoreEffectHandler,
  type HealthRestoreEffectHandlerDependencies,
} from "./health-restore-effect-handler.ts";
import {
  createItemObtainEffectHandler,
  type ItemObtainEffectHandlerDependencies,
} from "./item-obtain-effect-handler.ts";
import {
  createStatusAddEffectHandler,
  createStatusRemoveEffectHandler,
  type StatusEffectHandlerDependencies,
} from "./status-effect-handlers.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface CoreHandCardEffectHandlerDependencies {
  readonly healthRestore: HealthRestoreEffectHandlerDependencies;
  readonly status: StatusEffectHandlerDependencies;
  readonly itemObtain: ItemObtainEffectHandlerDependencies;
  readonly handCardDraw: HandCardDrawEffectHandlerDependencies;
}

/**
 * 方法名：registerCoreHandCardEffectHandlers
 * 作用：执行该方法负责的单一业务操作。
 * @param registry 方法所需的 registry 参数。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function registerCoreHandCardEffectHandlers(
  registry: HandCardEffectHandlerRegistry,
  dependencies: CoreHandCardEffectHandlerDependencies,
): HandCardEffectHandlerRegistry {
  registry.register(createHealthRestoreEffectHandler(dependencies.healthRestore));
  registry.register(createStatusAddEffectHandler(dependencies.status));
  registry.register(createStatusRemoveEffectHandler(dependencies.status));
  registry.register(createItemObtainEffectHandler(dependencies.itemObtain));
  registry.register(createHandCardDrawEffectHandler(dependencies.handCardDraw));
  return registry;
}

/**
 * 方法名：createCoreHandCardEffectHandlerRegistry
 * 作用：创建并校验该方法所负责的业务对象。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function createCoreHandCardEffectHandlerRegistry(
  dependencies: CoreHandCardEffectHandlerDependencies,
): HandCardEffectHandlerRegistry {
  return registerCoreHandCardEffectHandlers(new HandCardEffectHandlerRegistry(), dependencies);
}
