export const COVER_RESOLUTIONS = {
  "1264x1680": { width: 1264, height: 1680 },
  "1072x1448": { width: 1072, height: 1448 },
  "600x800": { width: 600, height: 800 },
} as const;

export type CoverResolutionName = keyof typeof COVER_RESOLUTIONS;

export interface CoverResolution {
  readonly name: CoverResolutionName;
  readonly width: number;
  readonly height: number;
}

export function isCoverResolutionName(value: string): value is CoverResolutionName {
  return value in COVER_RESOLUTIONS;
}

export function getCoverResolution(name: CoverResolutionName): CoverResolution {
  return { name, ...COVER_RESOLUTIONS[name] };
}

export function listCoverResolutionNames(): readonly CoverResolutionName[] {
  return Object.keys(COVER_RESOLUTIONS) as CoverResolutionName[];
}
