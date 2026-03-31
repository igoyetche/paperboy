# Publishing Paperboy to npm

## Prerequisites

- An npm account ([npmjs.com/signup](https://www.npmjs.com/signup))
- Node.js v22+ installed
- The project builds successfully (`npm run build`)

## Step-by-Step Guide

### 1. Log in to npm

```bash
npm login
```

Follow the prompts to authenticate (username, password, email, OTP if enabled).

### 2. Choose a package name

The current `name` in `package.json` is `"paperboy"`. This is likely already taken on npm. You have two options:

- **Scoped package (recommended):** `@your-username/paperboy` — always available, free to publish
- **Unscoped package:** Pick a unique name like `paperboy-kindle`

Update `package.json`:

```json
{
  "name": "@your-username/paperboy"
}
```

> If using a scoped name, you must pass `--access public` when publishing (scoped packages are private by default).

### 3. Add a `files` field to `package.json`

The `.gitignore` excludes `dist/`, but npm needs it. The `files` field is a whitelist that overrides `.gitignore` for publishing:

```json
{
  "files": [
    "dist/"
  ]
}
```

This ensures only the compiled output (and `package.json`, `README.md`, `LICENSE` which are always included) gets published. Source code, tests, docs, and config stay out.

### 4. Verify the shebang line

The CLI entry point (`dist/cli-entry.js`) must start with:

```
#!/usr/bin/env node
```

This is already present in `src/cli-entry.ts` and should carry through to the build output. Verify after building:

```bash
head -1 dist/cli-entry.js
```

### 5. Build the project

```bash
npm run build
```

### 6. Preview what will be published

```bash
npm pack --dry-run
```

Check that:
- `dist/` files are included
- `src/`, `test/`, `docs/`, `.env`, `.claude/` are **not** included
- The package size looks reasonable

### 7. Publish

For scoped packages:

```bash
npm publish --access public
```

For unscoped packages:

```bash
npm publish
```

### 8. Verify it works

After publishing, test that `npx` can run it:

```bash
npx @your-username/paperboy --version
```

## Updating the Version

Before each new publish, bump the version:

```bash
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)
```

Then build and publish:

```bash
npm run build
npm publish --access public
```

## Summary of `package.json` Changes Needed

```json
{
  "name": "@your-username/paperboy",
  "version": "1.0.0",
  "files": [
    "dist/"
  ],
  "bin": {
    "paperboy": "./dist/cli-entry.js"
  }
}
```

The `bin`, `type`, `engines`, `scripts`, and `dependencies` fields are already correct.

## See Also

- [signing-npm-package.md](signing-npm-package.md) — how to sign the package with npm provenance and GPG
