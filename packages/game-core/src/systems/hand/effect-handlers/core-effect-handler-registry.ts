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

export interface CoreHandCardEffectHandlerDependencies {
  readonly healthRestore: HealthRestoreEffectHandlerDependencies;
  readonly status: StatusEffectHandlerDependencies;
  readonly itemObtain: ItemObtainEffectHandlerDependencies;
  readonly handCardDraw: HandCardDrawEffectHandlerDependencies;
}

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

export function createCoreHandCardEffectHandlerRegistry(
  dependencies: CoreHandCardEffectHandlerDependencies,
): HandCardEffectHandlerRegistry {
  return registerCoreHandCardEffectHandlers(new HandCardEffectHandlerRegistry(), dependencies);
}
