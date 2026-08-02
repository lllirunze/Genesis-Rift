import type { PlayerId } from "@genesis-rift/shared";

import type { HandCardDeckState } from "./hand-card-deck-state.ts";
import type { HandCardCatalog } from "./hand-card-definition.ts";
import type { PlayerHandState } from "./player-hand-state.ts";
import { validateSharedHandCardZones } from "./validate-hand-card-zones.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardEffectStateSnapshot {
  readonly deckState: HandCardDeckState;
  readonly playerHandStates: readonly PlayerHandState[];
}

/** 封装该模块的状态与操作入口。 */
export class HandCardEffectStateChannel {
  private deckState: HandCardDeckState;
  private playerHandStates: readonly PlayerHandState[];

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param initialState 方法所需的 initialState 参数。
   * @returns 无返回值。
   */
  private constructor(
    initialState: HandCardEffectStateSnapshot,
    private readonly catalog: HandCardCatalog,
  ) {
    this.deckState = initialState.deckState;
    this.playerHandStates = Object.freeze([...initialState.playerHandStates]);
  }

  /**
   * 方法名：create
   * 作用：创建并校验该方法所负责的业务对象。
   * @param initialState 方法所需的 initialState 参数。
   * @param catalog 方法所需的 catalog 参数。
   * @returns 本次处理得到的结果。
   */
  static create(
    initialState: HandCardEffectStateSnapshot,
    catalog: HandCardCatalog,
  ): HandCardEffectStateChannel {
    validateSharedHandCardZones(initialState.deckState, initialState.playerHandStates, catalog);
    return new HandCardEffectStateChannel(initialState, catalog);
  }

  /**
   * 方法名：getDeckState
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @returns 本次处理得到的结果。
   */
  getDeckState(): HandCardDeckState {
    return this.deckState;
  }

  /**
   * 方法名：getPlayerHandState
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @param playerId 目标玩家标识。
   * @returns 本次处理得到的结果。
   */
  getPlayerHandState(playerId: PlayerId | string): PlayerHandState | null {
    return this.playerHandStates.find((state) => state.playerId === playerId) ?? null;
  }

  /**
   * 方法名：getPlayerHandStates
   * 作用：读取并返回符合条件的业务数据，不修改输入状态。
   * @returns 本次处理得到的结果。
   */
  getPlayerHandStates(): readonly PlayerHandState[] {
    return this.playerHandStates;
  }

  /**
   * 方法名：updateDeckAndPlayerHand
   * 作用：更新目标数据，并返回满足约束的新状态。
   * @param deckState 方法所需的 deckState 参数。
   * @param playerHandState 方法所需的 playerHandState 参数。
   * @returns 无返回值。
   */
  updateDeckAndPlayerHand(deckState: HandCardDeckState, playerHandState: PlayerHandState): void {
    const playerIndex = this.playerHandStates.findIndex(
      (state) => state.playerId === playerHandState.playerId,
    );

    if (playerIndex === -1) {
      throw new Error(
        `Cannot update an unregistered player hand state: ${playerHandState.playerId}`,
      );
    }

    const nextPlayerHandStates = this.playerHandStates.map((state, index) =>
      index === playerIndex ? playerHandState : state,
    );
    validateSharedHandCardZones(deckState, nextPlayerHandStates, this.catalog);
    this.deckState = deckState;
    this.playerHandStates = Object.freeze(nextPlayerHandStates);
  }

  /**
   * 方法名：exportState
   * 作用：将输入转换为稳定、可保存或可传输的表示。
   * @returns 本次处理得到的结果。
   */
  exportState(): HandCardEffectStateSnapshot {
    return Object.freeze({
      deckState: this.deckState,
      playerHandStates: Object.freeze([...this.playerHandStates]),
    });
  }
}
