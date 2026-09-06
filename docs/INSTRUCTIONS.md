# ApiMoq Release and Publishing Instructions

This document explains how to publish ApiMoq to GitHub and npm securely.

ApiMoq uses GitHub for source control, npm for public package distribution, GitHub Actions for CI/CD, and npm Trusted Publishing through GitHub Actions OIDC.

Repository: `git@github.com:Ohryzon/apimoq-cli.git`

Package: `apimoq-cli`

## Versioning model

The release workflow does not create versions automatically. The version is stored in `package.json`, and the workflow publishes only when a matching semantic-version tag is pushed.

```text
package.json: 0.1.1
Git tag:      v0.1.1
```

The values must match exactly. Never reuse an npm version that has already been published.

## GitHub repository configuration

Repository administrators should:

1. Protect `main`.
2. Require pull requests before merging.
3. Require CI, dependency-review, and CodeQL checks.
4. Protect tags matching `v*.*.*`.
5. Create a GitHub environment named `release`.
6. Require approval for the `release` environment.
7. Restrict who can create release tags.
8. Enable secret scanning and push protection when available.

The release workflow is `.github/workflows/release.yml`.

## One-time npm bootstrap for `0.1.0`

npm requires the package to exist before a Trusted Publisher can be configured. Publish `0.1.0` manually once; later versions are published automatically by GitHub Actions.

### 1. Update the repository

```bash
git checkout main
git pull --ff-only origin main
```

### 2. Run all checks

```bash
npm ci
npm run check
npm run audit:ci
npm run pack:ci
```

Every command must pass.

### 3. Confirm the publishing runtime

Trusted Publishing requires Node.js 22.14 or newer and npm CLI 11.5.1 or newer. The release workflow uses Node.js 24.

```bash
node --version
npm --version
```

### 4. Log in to npm

Use an npm account with two-factor authentication enabled:

```bash
npm login
```

### 5. Inspect the package

```bash
npm pack --dry-run
```

Confirm that only intended files are included, such as `README.md`, `LICENSE`, `dist/`, and `package.json`. The output must not contain credentials, tokens, `.env` files, `.apimoq/` data, logs, source-control metadata, or private application data.

### 6. Publish `0.1.0`

The current package version is `0.1.0`:

```bash
npm publish --access public
```

The package will be available at `https://www.npmjs.com/package/apimoq-cli`.

Published npm versions must be treated as immutable. Verify the package before publishing.

### 7. Configure npm Trusted Publishing

Open the `apimoq-cli` package settings on npm and add a GitHub Actions Trusted Publisher:

```text
Organization or user: Ohryzon
Repository:          apimoq-cli
Workflow filename:   release.yml
Environment:         release
Permission:          allow staged publishing only
```

Use only `release.yml` as the workflow filename, not the full path. Trusted Publishing uses short-lived OIDC credentials. Do not create or store an npm publish token in GitHub Actions. Leave direct `npm publish` permission unchecked.

After verifying the configuration, enable:

```text
Require two-factor authentication and disallow tokens
```

### 8. Create the initial GitHub release tag

Because `0.1.0` was already published manually, the release workflow detects the existing version and skips duplicate npm publication while still creating the GitHub Release.

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

The workflow validates the tag, checks the package version, installs locked dependencies, builds, tests, audits, creates the package tarball, and creates the GitHub Release.

## Future releases

Start from an updated clean branch:

```bash
git checkout main
git pull --ff-only origin main
git status
```

Run the checks:

```bash
npm ci
npm run check
npm run audit:ci
npm run pack:ci
```

Create a new version with npm:

```bash
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0
```

`npm version` updates `package.json`, updates `package-lock.json`, creates a Git commit, and creates the matching `vMAJOR.MINOR.PATCH` tag.

Push the commit and tag together:

```bash
git push origin main --follow-tags
```

The release workflow then stages the new version on npm using Trusted Publishing and generates provenance through GitHub Actions OIDC. It does not become publicly installable until a maintainer approves the staged package.

Review and approve the staged package:

```bash
npm stage list apimoq-cli
npm stage view <stage-id>
npm stage approve <stage-id>
```

The approval step requires maintainer authentication and two-factor authentication. Review the staged package contents before approving it.

## Release requirements

A release requires:

- A `vMAJOR.MINOR.PATCH` tag.
- A matching `package.json` version.
- Successful build and tests.
- A clean npm audit.
- A valid package tarball.
- Approval from the protected `release` environment.
- A configured npm Trusted Publisher.
- A GitHub-hosted runner.

If any requirement fails, npm publication does not occur.

## Security rules

- Never commit npm tokens, GitHub tokens, passwords, or private keys.
- Never add `.env` files or `.apimoq/` data to the package or repository.
- Do not bypass CI checks for a release.
- Do not force-push `main` or release tags.
- Do not reuse a published npm version.
- Do not publish from an unreviewed branch.
- Prefer Trusted Publishing with staged publishing over long-lived npm tokens.
- Review `npm pack --dry-run` output before the first release and whenever package contents change.

## Useful commands

```bash
node -p "require('./package.json').version"
npm view apimoq-cli version
git status
git log --oneline --decorate -5
git tag --list
```

Install the published CLI globally:

```bash
npm install --global apimoq-cli
```

Or run it without global installation:

```bash
npx apimoq-cli init
```

## Official references

- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [npm version](https://docs.npmjs.com/cli/v11/commands/npm-version/)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)
