# Oracle Database MCP Server

A Model Context Protocol (MCP) server that enables GitHub Copilot and other LLMs to execute read-only SQL queries against Oracle databases.

[![npm version](https://badge.fury.io/js/mcp-oracle-database.svg)](https://www.npmjs.com/package/mcp-oracle-database) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](./LICENSE.md) [![mcp-oracle-database MCP server](https://glama.ai/mcp/servers/tannerpace/mcp-oracle-database/badges/score.svg)](https://glama.ai/mcp/servers/tannerpace/mcp-oracle-database)

---

## ⚠️ Breaking Changes in v2.0

`DATE`, `TIMESTAMP`, `TIMESTAMP WITH TIME ZONE`, and `TIMESTAMP WITH LOCAL TIME ZONE` columns are now returned as **formatted strings** (`YYYY-MM-DD HH:mm:ss`) instead of raw JavaScript `Date` objects.

The timezone is controlled by `ORACLE_TIMEZONE` (IANA name). If unset it falls back to the server's system timezone, which may differ across machines.

**Action required — add `ORACLE_TIMEZONE` to your `.env` or MCP `env` block:**

```env
ORACLE_TIMEZONE=UTC        # or e.g. America/Chicago
```

---

## Table of Contents

1. [Installation](#-installation)
2. [Configure VS Code](#-configure-vs-code)
3. [Optional: Create a Read-Only User](#optional-create-a-read-only-user)
4. [Features](#features)
5. [Available Tools](#available-tools)
6. [Configuration Reference](#configuration-reference)
7. [Development](#development)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Documentation](#documentation)
11. [Licensing](#licensing)

---

## 📦 Installation

### From npm (quickest)

```bash
npm install -g mcp-oracle-database
```

### Build from Source

```bash
git clone https://github.com/tannerpace/mcp-oracle-database.git
cd mcp-oracle-database
npm install
npm run build
```

> **macOS Apple Silicon (M1/M2/M3/M4) with no Oracle yet?** See the [macOS Setup Guide](./docs/MACOS-SETUP.md) to spin up Oracle XE 21c locally via Colima.

---

## 🔌 Configure VS Code

Create `.vscode/mcp.json` in your workspace (or add to your global MCP config).

### Option A — From Source

```json
{
  "servers": {
    "oracleDatabase": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/mcp-oracle-database/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XE",
        "ORACLE_USER": "system",
        "ORACLE_PASSWORD": "OraclePwd123",
        "ORACLE_TIMEZONE": "UTC",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000",
        "ENFORCE_READ_ONLY_QUERIES": "true",
        "MCP_MAX_RESPONSE_CHARS": "50000",
        "MCP_MAX_ROWS_IN_RESPONSE": "200",
        "MCP_MAX_STRING_LENGTH": "500"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp-oracle-database` with the real path on your machine (e.g. `/Users/yourname/GITHUB/mcp-oracle-database`).

### Option B — From npm Global Install

```json
{
  "servers": {
    "oracleDatabase": {
      "type": "stdio",
      "command": "mcp-database-server",
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XE",
        "ORACLE_USER": "your_user",
        "ORACLE_PASSWORD": "your_password",
        "ORACLE_TIMEZONE": "UTC",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000",
        "ENFORCE_READ_ONLY_QUERIES": "true",
        "MCP_MAX_RESPONSE_CHARS": "50000",
        "MCP_MAX_ROWS_IN_RESPONSE": "200",
        "MCP_MAX_STRING_LENGTH": "500"
      }
    }
  }
}
```

After saving, reload VS Code and open a Copilot chat in **Agent mode**. Try:

```
"What tables are in the database?"
"Describe the HELP table"
"Show me 5 rows from the HELP table"
```

---

## Optional: Create a Read-Only User

Using `SYSTEM` is fine for local testing. For any real database, use a dedicated read-only user:

```sql
-- Connect: sqlplus system/OraclePwd123@localhost:1521/XEPDB1

CREATE USER readonly_user IDENTIFIED BY secure_password;
GRANT CREATE SESSION TO readonly_user;
GRANT SELECT ANY TABLE TO readonly_user;

-- Or restrict to specific tables:
-- GRANT SELECT ON myschema.orders TO readonly_user;
-- GRANT SELECT ON myschema.customers TO readonly_user;
```

Then update your `.env` or MCP config:

```env
ORACLE_CONNECTION_STRING=localhost:1521/XEPDB1
ORACLE_USER=readonly_user
ORACLE_PASSWORD=secure_password
```

---

## Features

- 🔒 **Read-only access** — Dedicated read-only database user for security
- 📡 **stdio transport** — No HTTP server; communicates via standard input/output
- ⚡ **Connection pooling** — Efficient Oracle connection management
- 📊 **Schema introspection** — Query table and column information
- 🔍 **Advanced schema discovery** — 5 specialized tools for tables, relationships, and data patterns
- 💾 **In-memory caching** — LRU cache with 5-minute TTL for fast repeated access
- 📝 **Audit logging** — All queries logged with execution metrics
- ⏱️ **Timeout protection** — Prevents long-running queries
- 🛡️ **Result limits** — Configurable row limits to prevent memory issues
- 🍎 **No Oracle Client needed** — Uses node-oracledb Thin Mode (pure JS, works on Apple Silicon)

### Architecture

```
GitHub Copilot / LLM
        ↓ (MCP Protocol)
  MCP Client (spawns process)
        ↓ (JSON-RPC over stdio)
    MCP Server (Node.js)
        ↓ (node-oracledb Thin Mode)
  Oracle Database (read-only user)
```

---

## Available Tools

### Core Tools

#### `query_database`
Execute read-only SQL SELECT queries.

```json
{
  "query": "SELECT table_name FROM user_tables FETCH FIRST 10 ROWS ONLY",
  "maxRows": 10
}
```

#### `get_database_schema`
Get a table list or column details for a specific table.

```json
{ "tableName": "ORDERS" }
```

### Schema Discovery Tools

| Tool | Purpose | Cached |
|------|---------|:------:|
| `listTables` | All accessible tables with metadata & optional row counts | ✅ |
| `describeTable` | Column types, constraints, primary/foreign keys | ✅ |
| `getTableRelations` | Foreign key relationships in JSON | ✅ |
| `getSampleValues` | Sample values to understand data formats | ❌ |
| `suggestRelatedTables` | Find related tables by FK, naming, shared columns | ❌ |

📖 See [Schema Discovery Documentation](./docs/SCHEMA-DISCOVERY.md) for full details and examples.

### Example Copilot Prompts

```
"List all tables in the database"
"Describe the ORDERS table and its relationships"
"How many active users are there?"
"What are the top 5 products by sales this month?"
"Show me recent transactions for customer ID 12345"
```

---

## Configuration Reference

All settings can go in `.env` or as `env` keys in your VS Code MCP config.

```env
# Oracle Database Connection
ORACLE_CONNECTION_STRING=localhost:1521/XE    # host:port/service
ORACLE_USER=system
ORACLE_PASSWORD=OraclePwd123

# Timezone (REQUIRED for consistent date/timestamp output)
ORACLE_TIMEZONE=UTC                          # IANA timezone, e.g. America/New_York

# Connection Pool
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10

# Query Safety
QUERY_TIMEOUT_MS=30000           # max query time in ms
MAX_ROWS_PER_QUERY=1000          # max rows Oracle will fetch
MAX_QUERY_LENGTH=50000           # max SQL length in chars
ENFORCE_READ_ONLY_QUERIES=true   # reject non-SELECT statements

# MCP Response Limits
MCP_MAX_RESPONSE_CHARS=50000     # hard cap on total response size
MCP_MAX_ROWS_IN_RESPONSE=200     # max rows per tool call response
MCP_MAX_STRING_LENGTH=500        # max chars per string field

# Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
ENABLE_FILE_LOGGING=true
LOG_DIR=./logs
NODE_ENV=development
```

> **Large schemas:** If your database has 500+ tables, raise `MCP_MAX_RESPONSE_CHARS` to `100000`.

---

## Development

### Scripts

```bash
npm run build          # Compile TypeScript → dist/
npm run dev            # Watch mode compilation
npm run clean          # Remove dist/
npm run typecheck      # Type-check without compiling
npm start              # Start MCP server (requires build first)
npm run test-client    # Core tool tests against live Oracle DB
npm run test-discovery # Schema discovery tool tests
```

### Project Structure

```
mcp-oracle-database/
├── src/
│   ├── server.ts               # MCP server entry point
│   ├── client.ts               # Core test client
│   ├── test-discovery.ts       # Discovery tools test client
│   ├── config.ts               # Zod-validated configuration
│   ├── database/
│   │   ├── oracleConnection.ts # Connection pool manager
│   │   ├── queryExecutor.ts    # Query execution + safety checks
│   │   └── types.ts
│   ├── tools/
│   │   ├── queryDatabase.ts    # query_database tool
│   │   ├── getSchema.ts        # get_database_schema tool
│   │   └── discovery/          # 5 schema discovery tools + cache
│   └── utils/
│       ├── logger.ts           # Lightweight file + console logger
│       └── responseFormatter.ts # MCP response size management
├── dist/                       # Compiled output (git-ignored)
├── .env                        # Your credentials (git-ignored)
├── .env.example                # Template
└── package.json
```

---

## Security Considerations

1. **Read-Only User** — Database user should have only SELECT privileges in production
2. **SQL Safety** — The server trusts the LLM to generate valid SQL; the read-only user is the safety net
3. **Query Limits** — Row count and timeout limits prevent resource exhaustion
4. **Audit Logging** — All queries logged with timestamps for review
5. **Local First** — Designed to run on your machine; can still connect to remote databases

---

## Troubleshooting

### Connection failed

```
Error: ORA-12545: Connect failed because target host or object does not exist
```

- Is Oracle running? `docker ps | grep oracle-xe`
- Check the port: `docker ps` should show `0.0.0.0:1521->1521/tcp`
- Try `localhost:1521/XE` for SYSTEM, `localhost:1521/XEPDB1` for other users

### Wrong service name

| Service | Use for |
|---------|---------|
| `localhost:1521/XE` | SYSTEM user, DBA operations |
| `localhost:1521/XEPDB1` | Regular application users |

### Permission denied

```
Error: ORA-00942: table or view does not exist
```

```sql
GRANT SELECT ANY TABLE TO your_user;
```

### Response too large

```
Response for tool 'listTables' exceeded MCP_MAX_RESPONSE_CHARS
```

```env
MCP_MAX_RESPONSE_CHARS=100000
```

### Colima / Docker issues (macOS)

See [macOS Setup Guide — Troubleshooting](./docs/MACOS-SETUP.md#troubleshooting).

### Thin Mode note

This project uses node-oracledb **Thin Mode** — a pure JavaScript driver that requires no Oracle Instant Client. It works on all platforms including Apple Silicon Macs.

---

## Documentation

📚 **Guides:**
- [macOS Setup Guide](./docs/MACOS-SETUP.md) — Local Oracle XE setup on Apple Silicon
- [Schema Discovery Guide](./docs/SCHEMA-DISCOVERY.md) — Advanced schema introspection tools
- [Schema Discovery Quick Reference](./docs/SCHEMA-DISCOVERY-QUICKREF.md) — Cheat sheet for all discovery tools
- [Schema Discovery Examples](./docs/SCHEMA-DISCOVERY-EXAMPLES.md) — MCP message examples
- [VS Code Integration Guide](./docs/VSCODE-INTEGRATION.md) — Set up with GitHub Copilot
- [Claude Desktop Integration Guide](./docs/CLAUDE-INTEGRATION.md) — Set up with Claude Desktop
- [MCP Integration Guide](./docs/MCP-INTEGRATION.md) — MCP protocol deep dive
- [Architecture Overview](./docs/ARCHITECTURE.md) — System architecture diagram
- [Logging Configuration](./docs/LOGGING.md) — Logging setup and configuration

📝 **Custom Instructions:**
- [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) — Project-wide Copilot instructions
- [`.github/instructions/`](./.github/instructions/) — Language-specific coding guidelines

<a href="https://glama.ai/mcp/servers/tannerpace/mcp-oracle-database">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/tannerpace/mcp-oracle-database/badges/card.svg" alt="Oracle Database MCP server" />
</a>

---

## Licensing

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE.md).

You are free to use, modify, and distribute this software under the terms of the AGPL-3.0. Any modified version deployed as a network service must make its source code available to users of that service.

See [LICENSE.md](./LICENSE.md) for the full license text.

---

> Oracle is a registered trademark of Oracle Corporation.
> This project is not affiliated with, endorsed by, or sponsored by Oracle Corporation.
