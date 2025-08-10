/**
 * Maps a value from one range to another range
 * @param value - The input value to map
 * @param fromMin - Minimum value of the input range
 * @param fromMax - Maximum value of the input range
 * @param toMin - Minimum value of the output range
 * @param toMax - Maximum value of the output range
 * @returns The mapped value in the target range
 */
export function minmaxmap(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number {
  if (fromMax === fromMin) {
    return toMin
  }

  const ratio = (value - fromMin) / (fromMax - fromMin)
  return toMin + ratio * (toMax - toMin)
}
