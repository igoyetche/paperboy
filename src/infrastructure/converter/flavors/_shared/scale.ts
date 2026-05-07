// Scaling helper for proportional sizing across different canvas resolutions
export function scale(
  currentWidth: number,
  designWidth: number,
  value: number,
): number {
  return Math.round((currentWidth / designWidth) * value);
}
