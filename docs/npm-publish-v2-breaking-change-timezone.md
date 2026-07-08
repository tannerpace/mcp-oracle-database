# npm Publish v2 — Breaking Change: Timezone Configuration

## Overview

The recent addition of `fetchTypeHandler` in `queryExecutor.ts` fundamentally changes how Oracle `DATE`, `TIMESTAMP`, `TIMESTAMP WITH TIME ZONE`, and `TIMESTAMP WITH LOCAL TIME ZONE` columns are returned. Previously, these columns were surfaced as raw JavaScript `Date` objects; they now return formatted strings (`YYYY-MM-DD HH:mm:ss`) in a timezone controlled by the new `ORACLE_TIMEZONE` environment variable. This is a **breaking change** for any consumer that relied on the prior output format. The package must be bumped from `1.1.4` to `2.0.0`, `ORACLE_TIMEZONE` must be documented as a required-or-recommended env var, and the new release must be published to npm.

---

## Requirements

1. **Semver compliance** — Bump to `2.0.0` (major) because the shape of date/timestamp values in query results changes for all existing users.
2. **Env documentation** — `ORACLE_TIMEZONE` must be clearly documented in `README.md` and `.env.example` so users know they should set it explicitly rather than rely on the server's system timezone default.
3. **VS Code MCP config examples** — Both "from source" and "from npm" `mcp.json` blocks in `README.md` must include `ORACLE_TIMEZONE`.
4. **Migration guidance** — A brief migration note must explain what changed and how to restore previous behavior (or match expected timezone).
5. **Pre-publish validation** — All TypeScript checks and unit tests must pass before publishing (`prepublishOnly` script already handles this).
6. **Git tags** — A `v2.0.0` git tag must be pushed to origin alongside the version bump commit so the release is traceable.
7. **npm publish** — The package must be published to the npm registry under the `mcp-oracle-database` name.

---

## Implementation Steps

### 1. Read the TypeScript and SQL instruction files

Before touching any files, load the applicable instruction files to stay consistent with project conventions:

- `.github/instructions/typescript.instructions.md`
- `.github/instructions/terminal.instructions.md`

### 2. Update `package.json` version to `2.0.0`

Change `"version": "1.1.4"` → `"version": "2.0.0"`.

> Alternatively, run `npm version major` to let npm do the bump, commit, and tag atomically (the `release:major` script does exactly this and also pushes).

### 3. Update `.env.example` — make `ORACLE_TIMEZONE` explicit (not commented out)

Currently the line reads:
```
# ORACLE_TIMEZONE=UTC
```

Change it to an uncommented, required-looking entry with a comment explaining the impact:
```
# Timezone for DATE/TIMESTAMP columns (IANA timezone, e.g. UTC, America/New_York, Asia/Shanghai)
# REQUIRED for consistent date output. Defaults to the server system timezone if not set.
ORACLE_TIMEZONE=UTC
```

### 4. Update `README.md`

#### 4a. Add `ORACLE_TIMEZONE` to the "Configure Environment" `.env` example block

The minimal example (Step 5) should include `ORACLE_TIMEZONE`:
```env
ORACLE_CONNECTION_STRING=localhost:1521/XE
ORACLE_USER=system
ORACLE_PASSWORD=OraclePwd123
ORACLE_TIMEZONE=UTC
```

#### 4b. Add `ORACLE_TIMEZONE` to both `mcp.json` env blocks (Option A and Option B)

Both the "from source" and "from npm global install" JSON config snippets in the **Configure VS Code** section must include:
```json
"ORACLE_TIMEZONE": "UTC"
```

#### 4c. Add a **Breaking Changes** or **Migration Guide** section

Place this near the top of the README (after the badges / intro blurb) or in a dedicated `## Migration Guide` section:

```markdown
## ⚠️ Breaking Changes in v2.0

### Date & Timestamp Formatting (v2.0)

`DATE`, `TIMESTAMP`, `TIMESTAMP WITH TIME ZONE`, and `TIMESTAMP WITH LOCAL TIME ZONE`
columns are now returned as formatted strings (`YYYY-MM-DD HH:mm:ss`) instead of
JavaScript `Date` objects.

The timezone used for formatting is controlled by the `ORACLE_TIMEZONE` environment
variable (IANA timezone name). If not set, it defaults to the **server's system
timezone**, which may differ across machines and produce inconsistent results.

**Action required:** Add `ORACLE_TIMEZONE` to your `.env` or MCP server `env` block:
```
ORACLE_TIMEZONE=UTC        # or your local timezone, e.g. America/Chicago
```
```

#### 4d. Add a full Environment Variables reference table

Create or update an **Environment Variables** table in the README that lists every variable, whether it is required or optional, its default, and a description — including `ORACLE_TIMEZONE`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `ORACLE_CONNECTION_STRING` | Yes | — | `host:port/service` |
| `ORACLE_USER` | Yes | — | Database username |
| `ORACLE_PASSWORD` | Yes | — | Database password |
| `ORACLE_TIMEZONE` | **Recommended** | Server system TZ | IANA timezone for date/timestamp formatting |
| `ORACLE_POOL_MIN` | No | `2` | Min connections in pool |
| `ORACLE_POOL_MAX` | No | `10` | Max connections in pool |
| `QUERY_TIMEOUT_MS` | No | `30000` | Query timeout (ms) |
| `MAX_ROWS_PER_QUERY` | No | `1000` | Hard cap on rows fetched |
| `ENFORCE_READ_ONLY_QUERIES` | No | `true` | Block non-SELECT statements |
| `MCP_MAX_RESPONSE_CHARS` | No | `50000` | Token budget for MCP responses |
| `MCP_MAX_ROWS_IN_RESPONSE` | No | `100` | Row cap in MCP response |
| `MCP_MAX_STRING_LENGTH` | No | `300` | Per-cell string truncation |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `ENABLE_AUDIT_LOGGING` | No | `true` | Log every executed query |

### 5. Verify the build and tests pass locally

```bash
npm run typecheck   # TypeScript type check
npm test            # vitest unit tests
npm run build       # compile to dist/
```

All three must exit with code `0` before proceeding.

### 6. Commit the documentation and version changes

```bash
git add package.json .env.example README.md
git commit -m "docs: document ORACLE_TIMEZONE; bump to v2.0.0 (breaking change)"
```

### 7. Create and push the git tag

```bash
git tag v2.0.0
git push origin main
git push origin v2.0.0
```

> If using the npm script approach: `npm run release:major` handles the version bump, git tag, push, and `npm publish` in one command (calls `prepublishOnly` checks automatically).

### 8. Publish to npm

```bash
npm publish
```

Confirm the published package at:
`https://www.npmjs.com/package/mcp-oracle-database`

The `prepublishOnly` script (`typecheck && test && clean && build`) runs automatically before publish.

### 9. Post-publish verification

- Check `https://www.npmjs.com/package/mcp-oracle-database` for version `2.0.0`.
- Run `npm install -g mcp-oracle-database@2.0.0` in a clean environment and confirm `mcp-database-server --version` (or startup) works.
- Confirm the `dist/` files list in `package.json` includes everything needed (no missing tool files).

---

## File Change Summary

| File | Change |
|---|---|
| `package.json` | `version` → `2.0.0` |
| `.env.example` | Uncomment and promote `ORACLE_TIMEZONE=UTC` |
| `README.md` | Add migration guide, update env examples in both mcp.json blocks, add env var reference table |
