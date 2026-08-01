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

export interface RandomRequestContext {
  readonly purpose: string;
  readonly gameId?: GameId;
  readonly target?: LogTarget;
}

export interface ScopedRandomRequest extends RandomRequestContext {
  readonly streamType: RandomStreamType;
  readonly scopeId?: string | null;
}

export interface IntegerRandomRequest extends ScopedRandomRequest {
  readonly minInclusive: number;
  readonly maxExclusive: number;
}

export interface WeatherRandomRequest extends RandomRequestContext {
  readonly recovery?: boolean;
}

export class RandomService {
  readonly #manager: RandomManager;
  readonly #logger: Logger;

  constructor(manager: RandomManager, logger: Logger) {
    this.#manager = manager;
    this.#logger = logger;
  }

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
