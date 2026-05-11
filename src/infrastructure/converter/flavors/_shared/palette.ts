/**
 * Deterministic hashing helpers for cover flavor palette derivation.
 *
 * Implements FR-40 (PB-027): per-article hashed accent palette and issue number.
 */

/**
 * FNV-1a 32-bit hash. Deterministic, dependency-free.
 */
export function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.codePointAt(i) ?? 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Returns a deterministic 3-digit zero-padded issue number string (e.g. "042").
 */
export function issueNumberFor(seed: string): string {
  const n = fnv1a32(seed) % 1000;
  return n.toString().padStart(3, "0");
}

/**
 * Returns a deterministic HSL accent color string for the given seed.
 */
export function accentFor(seed: string): string {
  const h = fnv1a32(seed);
  const hue = h % 360;
  const family = (h >> 8) & 1;
  if (family === 0) {
    return `hsl(${hue}, 65%, 38%)`;
  }
  const warmHue = (hue % 60) + 10;
  return `hsl(${warmHue}, 55%, 42%)`;
}
