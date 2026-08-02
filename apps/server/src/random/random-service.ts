import {
  createWeatherDeck as createCoreWeatherDeck,
  drawRecoveryWeatherCard,
  drawWeatherCard as drawCoreWeatherCard,
  rollD20 as rollCoreD20,
  rollD6 as rollCoreD6,
  WEATHER_DECK_SCOPE_ID,
  type RandomManager,
  type RandomStream,
  type RandomStreamType,
  type WeatherCardDrawResult,
  type WeatherDeckState,
} from "@genesis-rift/game-core";
import type { GameId } from "@genesis-rift/shared";

import { type Logger, type LogTarget } from "../logging/index.ts";

/** 描述一次业务结算所需的上下文与外部依赖。 */
export interface RandomRequestContext {
  readonly purpose: string;
  readonly gameId?: GameId;
  readonly target?: LogTarget;
}

/** 描述一次业务请求所需的输入数据。 */
export interface ScopedRandomRequest extends RandomRequestContext {
  readonly streamType: RandomStreamType;
  readonly scopeId?: string | null;
}

/** 描述一次业务请求所需的输入数据。 */
export interface IntegerRandomRequest extends ScopedRandomRequest {
  readonly minInclusive: number;
  readonly maxExclusive: number;
}

/** 描述一次业务请求所需的输入数据。 */
export interface WeatherRandomRequest extends RandomRequestContext {
  readonly recovery?: boolean;
}

/** 封装该模块的状态与操作入口。 */
export class RandomService {
  readonly #manager: RandomManager;
  readonly #logger: Logger;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param manager 方法所需的 manager 参数。
   * @param logger 方法所需的 logger 参数。
   * @returns 无返回值。
   */
  constructor(manager: RandomManager, logger: Logger) {
    this.#manager = manager;
    this.#logger = logger;
  }

  /**
   * 方法名：nextInt
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  nextInt(request: IntegerRandomRequest): number {
    const stream = this.#getStream(request);

    return this.#execute(
      "nextInt",
      request,
      stream,
      () => stream.nextInt(request.minInclusive, request.maxExclusive),
      (result) => `Generated integer random value ${result}.`,
      (result) => ({
        result,
        minInclusive: request.minInclusive,
        maxExclusive: request.maxExclusive,
      }),
    );
  }

  /**
   * 方法名：rollD6
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  rollD6(request: ScopedRandomRequest): number {
    const stream = this.#getStream(request);

    return this.#execute(
      "rollD6",
      request,
      stream,
      () => rollCoreD6(stream),
      (result) => `Rolled D6 with result ${result}.`,
      (result) => ({ result, sides: 6 }),
    );
  }

  /**
   * 方法名：rollD20
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  rollD20(request: ScopedRandomRequest): number {
    const stream = this.#getStream(request);

    return this.#execute(
      "rollD20",
      request,
      stream,
      () => rollCoreD20(stream),
      (result) => `Rolled D20 with result ${result}.`,
      (result) => ({ result, sides: 20 }),
    );
  }

  /**
   * 方法名：createWeatherDeck
   * 作用：创建并校验该方法所负责的业务对象。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  createWeatherDeck(request: RandomRequestContext): WeatherDeckState {
    const stream = this.#manager.getStream("weather", WEATHER_DECK_SCOPE_ID);

    return this.#execute(
      "createWeatherDeck",
      request,
      stream,
      () => createCoreWeatherDeck(stream),
      () => "Weather deck was shuffled successfully.",
      (result) => ({
        deckScopeId: WEATHER_DECK_SCOPE_ID,
        drawPileSize: result.drawPile.length,
      }),
    );
  }

  /**
   * 方法名：drawWeatherCard
   * 作用：从共享牌库取得指定手牌并更新牌区状态。
   * @param state 当前业务状态。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  drawWeatherCard(state: WeatherDeckState, request: WeatherRandomRequest): WeatherCardDrawResult {
    const stream = this.#manager.getStream("weather", WEATHER_DECK_SCOPE_ID);
    const recovery = request.recovery ?? false;

    return this.#execute(
      recovery ? "drawRecoveryWeatherCard" : "drawWeatherCard",
      request,
      stream,
      () =>
        recovery ? drawRecoveryWeatherCard(state, stream) : drawCoreWeatherCard(state, stream),
      (result) => `Weather deck drew card ${result.cardId}.`,
      (result) => ({
        recovery,
        previousDrawCount: state.drawCount,
        cardId: result.cardId,
        triggerType: result.triggerType,
        reshuffled: result.reshuffled,
        skippedJokerCount: result.skippedJokerCount,
      }),
    );
  }

  #getStream(request: ScopedRandomRequest): RandomStream {
    return this.#manager.getStream(request.streamType, request.scopeId ?? null);
  }

  #execute<Result>(
    operation: string,
    request: RandomRequestContext,
    stream: RandomStream,
    execute: () => Result,
    createMessage: (result: Result) => string,
    createResultContext: (result: Result) => Readonly<Record<string, unknown>>,
  ): Result {
    this.#assertPurpose(request.purpose);
    const callCountBefore = stream.exportState().callCount;

    try {
      const result = execute();
      const callCountAfter = stream.exportState().callCount;

      this.#logger.debug({
        action: "Random",
        module: "RandomService",
        message: createMessage(result),
        ...(request.target === undefined ? {} : { target: request.target }),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          operation,
          purpose: request.purpose,
          streamType: stream.streamType,
          scopeId: stream.scopeId,
          callCountBefore,
          callCountAfter,
          ...createResultContext(result),
        },
      });

      return result;
    } catch (error) {
      this.#logger.error({
        action: "Random",
        module: "RandomService",
        message: `Random operation ${operation} failed.`,
        ...(request.target === undefined ? {} : { target: request.target }),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          operation,
          purpose: request.purpose,
          streamType: stream.streamType,
          scopeId: stream.scopeId,
          callCountBefore,
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
      });
      throw error;
    }
  }

  #assertPurpose(purpose: string): void {
    if (purpose.trim().length === 0) {
      throw new TypeError("Random request purpose cannot be empty.");
    }
  }
}
