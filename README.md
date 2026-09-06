# ApiMoq CLI

ApiMoq is an open-source, local development utility for running a small, stateful HTTP API from a JSON contract. It is intended for frontend teams that need a dependable API boundary before the production backend is available.

The project is distributed under the MIT License. Keep generated contracts and local data free of credentials, personal data, and production exports.

## Contents

- [Purpose](#purpose)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [CLI reference](#cli-reference)
- [Contract format](#contract-format)
- [Generated data and persistence](#generated-data-and-persistence)
- [HTTP behavior](#http-behavior)
- [Security and safe usage](#security-and-safe-usage)
- [Project layout](#project-layout)
- [Development](#development)
- [Version scope](#version-scope)

## Purpose

ApiMoq provides a local API boundary that frontend code can call with ordinary `fetch` or `axios` requests. It supports generated seed records, CRUD mutations, request validation, filtering, pagination, sorting, and explicit custom endpoints.

The frontend should use a configurable base URL, for example:

```text
http://localhost:4000/api
```

When the real backend is ready, change that environment value in the frontend application. No ApiMoq client library is required.

## Requirements

- Node.js 20 or newer
- npm access to the private project dependencies
- A writable project directory

The CLI is designed for local development and is not a production HTTP server.

## Quick start

From the application directory that should contain the local contract:

```bash
npx apimoq init
npx apimoq generate
npx apimoq dev
```

The server starts at `http://localhost:4000`. The generated example exposes `GET /api/products`.

Use `Ctrl+C` to stop the server. Edit `.apimoq/api.json`, rerun `generate` when seed data needs to change, and restart `dev` to load contract changes.

## CLI reference

### `apimoq init`

Creates a new `.apimoq/` directory containing:

```text
.apimoq/
├── api.json       Contract definition
├── config.json    Local server and generation settings
├── data.json      Persisted mock records
└── README.md      Contract guidance
```

Initialization refuses to overwrite an existing `.apimoq/` directory.

### `apimoq generate [resource] [--yes]`

Generates records for every resource, or only the named resource. Existing records for the selected resources are replaced only after confirmation. Use `--yes` for an intentional non-interactive replacement:

```bash
apimoq generate products --yes
```

### `apimoq dev [--port <number>]`

Starts the local API server. The optional port overrides `config.json` for that run:

```bash
apimoq dev --port 4100
```

The server binds to loopback (`127.0.0.1`) only.

### `apimoq inspect`

Prints resource record counts and explicit endpoint summaries without starting the server.

### `apimoq reset`

Clears `.apimoq/data.json`. Run `apimoq generate` afterward if the project needs seeded records again.

## Contract format

The contract is strict JSON and can contain both resources and explicit endpoints.

### Resource shorthand

Resources automatically expose collection and item CRUD routes:

```json
{
  "resources": {
    "products": {
      "schema": {
        "id": "uuid",
        "name": "productName",
        "price": "price",
        "stock": "integer",
        "active": "boolean"
      },
      "generate": 20
    }
  }
}
```

This creates:

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
```

### Explicit endpoints

Use explicit endpoints for non-CRUD responses:

```json
{
  "endpoints": {
    "health": {
      "method": "GET",
      "path": "/api/health",
      "response": { "ok": true }
    }
  }
}
```

Response schemas are resolved when the endpoint is called. Literal and mock values remain fixed; supported generated types produce generated values.

### Supported schema values

Primitive types:

```text
string, number, integer, boolean, email, uuid, date, datetime, url
```

Semantic aliases:

```text
name, avatar, price, city, country, company, address, phone,
paragraph, sentence, productName
```

Enums, fixed values, mocks, arrays, and nested objects are also supported:

```json
{
  "role": ["admin", "user"],
  "currency": "KES",
  "displayName": { "type": "string", "mock": "Demo User" },
  "tags": { "type": "array", "items": "string", "count": 3 },
  "profile": { "city": "city", "country": "country" }
}
```

## Generated data and persistence

`apimoq generate` writes records to `.apimoq/data.json`. Resource reads use those persisted records; the server does not regenerate them on every request.

If `config.json` contains a numeric `seed`, generation is repeatable. A generated resource replaces its existing collection rather than appending duplicate records.

Resource mutations write immediately using an atomic file replacement. The data file is intentionally human-readable, but it should contain mock data only. Never place credentials, access tokens, personal data, or production exports in `.apimoq/data.json`.

## HTTP behavior

Collection reads support:

```text
GET /api/products?page=1&limit=10&sort=price&order=desc&category=tools
```

The response is:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 0 }
}
```

Successful mutation defaults are:

```text
POST   201 with the created record
PATCH  200 with the updated record
DELETE 204 with no response body
```

POST and PATCH bodies are strictly validated. Unknown fields and type mismatches return structured `400` responses. Resource PATCH requests are partial merges; omitted fields are preserved.

## Security and safe usage

ApiMoq is a development simulator, not an internet-facing service.

- The CLI binds the server to `127.0.0.1` only.
- Cross-origin access is limited to browser origins on `localhost` and `127.0.0.1`; arbitrary origins are not allowed.
- Request bodies are limited to 1 MiB.
- Do not expose the port through a reverse proxy, tunnel, container port mapping, or network interface without adding an approved authentication and access-control layer.
- Do not use real credentials, tokens, customer data, or production database exports in contracts or generated data.
- Treat `.apimoq/` as development data. Review it before committing or sharing it.
- Keep dependency installation and package publication within the repository's protected release workflow.
- Do not use `apimoq dev` as a production server or as a substitute for backend authorization.

## Project layout

The implementation is grouped by responsibility:

```text
src/
├── cli/        Command-line commands and project orchestration
├── config/     Config and contract loading/validation
├── contract/   Route expansion and path matching
├── http/       Node HTTP server and HTTP integration tests
├── schema/     Generation and request validation
├── storage/    Atomic JSON persistence
├── templates/  Files generated by `apimoq init`
└── shared/     Shared types and project paths
```

## Development

Install dependencies and run the checks:

```bash
npm install
npm run build
npm test
```

The test suite covers schema resolution, deterministic generation, validation, CRUD persistence, filtering, pagination, and HTTP behavior.

Before making a private build available to another developer, verify the package contents and confirm that no `.apimoq/` data, credentials, logs, or local configuration files are included.

## CI/CD and versioning

GitHub Actions validates pushes and pull requests before they are merged. The pipeline runs the locked install, builds the TypeScript output, executes tests on Node.js 20 and 22, audits dependencies, reviews pull-request dependency changes, and runs CodeQL analysis.

Releases are tag-driven. To create a release:

```bash
npm version patch
git push origin main --follow-tags
```

The release workflow accepts only `vMAJOR.MINOR.PATCH` tags and requires the tag to match `package.json`. It builds and tests the tagged source, publishes the package to the public npm registry using npm Trusted Publishing/OIDC, and attaches the same tarball to a GitHub Release.

Repository administrators should protect `main` and `v*.*.*` tags, require the CI, dependency-review, and CodeQL checks, require pull requests and signed commits where applicable, configure npm Trusted Publishing for this repository/workflow, and configure the `release` environment with approval rules. These repository settings cannot be enforced by files in the repository alone.

## Version scope

The current release focuses on the JSON-first local API loop. Error scenarios, latency simulation, authentication, OpenAPI import, a browser Studio, custom JavaScript generators, and alternate storage engines are intentionally outside this version.
