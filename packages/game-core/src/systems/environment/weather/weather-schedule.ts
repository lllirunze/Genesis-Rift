/**
 * 方法名：shouldDrawScheduledWeather
 * 作用：判断输入是否满足当前业务条件。
 * @param round 方法所需的 round 参数。
 * @param hasActiveMajorDisaster 方法所需的 hasActiveMajorDisaster 参数。
 * @returns 本次处理得到的结果。
 */
export function shouldDrawScheduledWeather(
  round: number,
  hasActiveMajorDisaster: boolean,
): boolean {
  if (!Number.isSafeInteger(round) || round < 1) {
    throw new RangeError("round must be a positive safe integer");
  }

  return !hasActiveMajorDisaster && round % 2 === 1;
}
