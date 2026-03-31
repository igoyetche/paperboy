# Signing the Paperboy npm Package

npm package signing establishes a verifiable link between a published package and its source code. This guide covers the two approaches: **npm provenance** (recommended) and **GPG signing** (for git commits).

---

## Approach 1: npm Provenance (Recommended)

npm provenance ties the published package to a specific git commit and CI/CD workflow run using [Sigstore](https://www.sigstore.dev/). Anyone can verify that the package on npm was built from the exact source on GitHub — no manual key management required.

### How it works

When you run `npm publish --provenance` inside a GitHub Actions workflow, npm uses OIDC to obtain a short-lived certificate from Sigstore's CA, signs the package, and attaches a publicly verifiable attestation to the npm registry entry. The package's npm page shows a "Provenance" badge with a link to the exact workflow run that produced it.

### Requirements

- Package must be published from **GitHub Actions** (GitLab CI and other providers also supported)
- The repository must be public, or you must have npm Teams/Enterprise for private provenance
- npm CLI v9.5+ (Node 22 ships with a compatible version)
- The npm token used in CI must have `Automation` type (not `Publish` — Publish tokens don't support provenance)

### Step 1: Create an npm Automation token

1. Go to [npmjs.com](https://www.npmjs.com) → your avatar → **Access Tokens**
2. Click **Generate New Token** → **Granular Access Token**
3. Set:
   - **Token name**: `paperboy-ci`
   - **Expiration**: 365 days (or your preference)
   - **Packages and scopes**: Read and write → select your package (or `@your-username/paperboy`)
   - **Organizations**: No access needed
4. Copy the token

### Step 2: Add the token to GitHub secrets

In your GitHub repository:

1. **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `NPM_TOKEN`, value: the token you copied

### Step 3: Add the GitHub Actions workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # required for provenance

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test

      - name: Publish with provenance
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> The `id-token: write` permission is what allows the workflow to obtain an OIDC token from GitHub for Sigstore.

### Step 4: Publish via a GitHub Release

Provenance is triggered by the workflow above, which runs on GitHub **Release** events:

1. Tag the commit: `git tag v1.0.1`
2. Push the tag: `git push origin v1.0.1`
3. On GitHub: **Releases** → **Draft a new release** → select the tag → **Publish release**
4. The workflow runs automatically and publishes with provenance attached

### Verifying provenance

After publishing, anyone can verify the attestation:

```bash
npm audit signatures @your-username/paperboy
```

Or view the provenance details on the package's npm page under the **Provenance** tab.

---

## Approach 2: GPG Signing (Git Commits and Tags)

GPG signing applies to **git commits and tags**, not the npm package itself. It proves that commits in your repository were made by a specific key holder. This complements provenance (which covers the npm artifact) rather than replacing it.

### Step 1: Generate a GPG key

```bash
gpg --full-generate-key
```

Choose:
- Key type: `RSA and RSA`
- Key size: `4096`
- Expiration: `1y` (rotate annually)
- Name and email: must match your git config

### Step 2: Export and add to GitHub

```bash
# List your keys to find the key ID
gpg --list-secret-keys --keyid-format=long

# Export the public key (replace KEY_ID with your key ID)
gpg --armor --export KEY_ID
```

Copy the output and add it to GitHub: **Settings** → **SSH and GPG keys** → **New GPG key**.

### Step 3: Configure git to sign commits

```bash
git config --global user.signingkey KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

Now all commits and tags are signed automatically.

### Step 4: Sign the release tag

When tagging a release:

```bash
git tag -s v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

The `-s` flag signs with your GPG key. GitHub shows a "Verified" badge on the tag.

---

## Recommended Combination

For maximum supply chain security:

| Layer | Tool | What it proves |
|-------|------|----------------|
| Git commits | GPG signing | Commits came from the key holder |
| Git tags | GPG signing | Release tags are authentic |
| npm package | npm provenance | Package was built from this exact commit in this CI run |

Use both: sign commits/tags with GPG locally, and publish with `--provenance` from GitHub Actions.

---

## See Also

- [publishing-to-npm.md](publishing-to-npm.md) — how to publish the package
- [npm provenance documentation](https://docs.npmjs.com/generating-provenance-statements)
- [Sigstore](https://www.sigstore.dev/) — the transparency log backing npm provenance
- [GitHub: signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)
