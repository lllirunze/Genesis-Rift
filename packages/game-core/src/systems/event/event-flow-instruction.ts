import type { ActivateEventDurationOutcome } from "./activate-event-duration.ts";
import type { EventDurationEndInstruction } from "./event-duration-instance.ts";
import type {
  PendingRevealEventInstance,
  ResolvedEventInstance,
  ResolvingEventInstance,
  RevealedEventInstance,
} from "./event-instance.ts";

/** 描述统一事件流程在当前步骤完成后需要调用方执行的下一项操作。 */
export type EventFlowInstruction =
  | {
      readonly type: "NO_EVENT";
    }
  | {
      readonly type: "WAIT_REVEAL_DECISION";
      readonly instance: PendingRevealEventInstance;
    }
  | {
      readonly type: "WAIT_OPTION_SELECTION";
      readonly instance: RevealedEventInstance;
    }
  | {
      readonly type: "READY_TO_RESOLVE";
      readonly instance: RevealedEventInstance | ResolvingEventInstance;
    }
  | {
      readonly type: "DECLINED";
      readonly instanceId: string;
    }
  | {
      readonly type: "COMPLETED";
      readonly instance: ResolvedEventInstance;
      readonly durationOutcome: ActivateEventDurationOutcome;
      readonly durationEndInstructions: readonly EventDurationEndInstruction[];
    };
