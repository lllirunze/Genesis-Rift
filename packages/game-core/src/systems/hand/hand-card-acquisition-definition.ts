import { HAND_CARD_DRAW_SOURCE_TYPES } from "./hand-card-config.ts";

export type HandCardDrawSourceType = (typeof HAND_CARD_DRAW_SOURCE_TYPES)[number];

export interface HandCardDrawSource {
  readonly type: HandCardDrawSourceType;
  readonly sourceId: string;
}
