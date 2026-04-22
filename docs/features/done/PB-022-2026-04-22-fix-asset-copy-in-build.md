# PB-022 — Fix: Missing asset copy in build

**Status:** Complete
**Priority:** High
**Created:** 2026-04-22
**Completed:** 2026-04-22

## Motivation

The `paperboy` watch-mode (and any run from `dist/`) crashes at startup with:

```
Configuration error: ENOENT: no such file or directory,
open '.../dist/infrastructure/converter/assets/cover-icon.png'
```

The EPUB cover generator reads `cover-icon.png` from a path relative to the compiled
JavaScript file. The build script (`tsc`) only compiles TypeScript — it does not copy
non-TypeScript assets. As a result, the `assets/` folder is never present in `dist/`,
causing a hard crash on startup.

## Scope

Fix the build pipeline so that static assets are copied alongside the compiled JS.
No domain logic, specs, or feature behaviour changes.

## Acceptance Criteria

- [x] `npm run build` completes without error
- [x] `dist/infrastructure/converter/assets/cover-icon.png` exists after the build
- [x] `node dist/index.js` starts without an ENOENT error
- [x] All existing tests continue to pass
