export function shouldDrawScheduledWeather(
  round: number,
  hasActiveMajorDisaster: boolean,
): boolean {
  if (!Number.isSafeInteger(round) || round < 1) {
    throw new RangeError("round must be a positive safe integer");
  }

  return !hasActiveMajorDisaster && round % 2 === 1;
}
