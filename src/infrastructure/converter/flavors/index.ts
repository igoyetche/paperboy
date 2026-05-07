/**
 * Flavor registry — static map of all registered CoverFlavor implementations.
 *
 * Adding a flavor: create a folder under flavors/<name>/ implementing the CoverFlavor
 * contract, then add one import + one entry to FLAVORS below. No engine changes needed.
 *
 * Implements FR-38 (PB-026): static, type-safe flavor registry.
 */

import type { CoverFlavor } from "../../../domain/ports.js";
import { classic } from "./classic/index.js";

/**
 * All registered flavors. Keys are the valid values for PAPERBOY_COVER_FLAVOR.
 * `as const satisfies` ensures each value implements CoverFlavor at compile time.
 */
const FLAVORS = {
  classic,
} satisfies Record<string, CoverFlavor>;

/** Union of valid flavor name strings. */
export type FlavorName = keyof typeof FLAVORS;

/**
 * Type-guard: returns true when `value` is a registered FlavorName.
 * Used by loadConfig() to validate PAPERBOY_COVER_FLAVOR at startup.
 */
export function isFlavorName(value: string): value is FlavorName {
  return value in FLAVORS;
}

/**
 * Returns the CoverFlavor for a validated FlavorName.
 * Callers must narrow `name` through isFlavorName() before calling this.
 */
export function getFlavor(name: FlavorName): CoverFlavor {
  return FLAVORS[name];
}

/**
 * Returns all registered flavor names in insertion order.
 * Used in ConfigError messages and by the fixture comparison test.
 */
export function listFlavorNames(): readonly FlavorName[] {
  return Object.keys(FLAVORS) as FlavorName[];
}
