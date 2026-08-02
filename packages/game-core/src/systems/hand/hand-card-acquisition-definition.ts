import { HAND_CARD_DRAW_SOURCE_TYPES } from "./hand-card-config.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export type HandCardDrawSourceType = (typeof HAND_CARD_DRAW_SOURCE_TYPES)[number];

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardDrawSource {
  readonly type: HandCardDrawSourceType;
  readonly sourceId: string;
}
