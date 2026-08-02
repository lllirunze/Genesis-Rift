import type { HandCardEffectExecutionContext } from "../hand-card-effect-context.ts";

export function getPlayerEffectTargetIds(
  context: HandCardEffectExecutionContext,
): readonly string[] {
  return context.targets
    .filter((target) => target.type === "player")
    .map((target) => target.targetId);
}
