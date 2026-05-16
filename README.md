# Oracle Database MCP Server

A Model Context Protocol (MCP) server that enables GitHub Copilot and other LLMs to execute read-only SQL queries against Oracle databases.

[![npm version](https://badge.fury.io/js/mcp-oracle-database.svg)](https://www.npmjs.com/package/mcp-oracle-database)
[![License: Dual (GPLv3 / Commercial)](https://img.shields.io/badge/License-Dual%20GPLv3%20%2F%20Commercial-blue.svg)](./LICENSE.md)

<a href="https://glama.ai/mcp/servers/@tannerpace/mcp-oracle-database">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@tannerpace/mcp-oracle-database/badge" alt="Oracle Database Server MCP server" />
</a>

---

## Table of Contents

1. [macOS Setup (Apple Silicon — M1/M2/M3/M4)](#-macos-setup-apple-silicon--m1m2m3m4)
2. [Installation](#-installation)
3. [Configure VS Code](#-configure-vs-code)
4. [Optional: Create a Read-Only User](#optional-create-a-read-only-user)
5. [Features](#features)
6. [Available Tools](#available-tools)
7. [Configuration Reference](#configuration-reference)
8. [Development](#development)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)
11. [Documentation](#documentation)
12. [Licensing](#licensing)

---

## 🍎 macOS Setup (Apple Silicon — M1/M2/M3/M4)

This is the recommended path for Mac users. We use **Colima** as the Docker runtime (lighter than Docker Desktop and works natively on Apple Silicon) and build the MCP server from source.

### Step 1 — Install Prerequisites

**Homebrew** (skip if already installed):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Node.js v18+** via nvm (recommended):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell config, then install Node
source ~/.zshrc
nvm install 20
nvm use 20
node --version    # should print v20.x.x
```

Or via Homebrew:
```bash
brew install node
node --version
```

**Colima + Docker CLI**:
```bash
brew install colima docker
```

### Step 2 — Start Colima

Colima is a lightweight container runtime for macOS — no Docker Desktop required.

```bash
# Start with enough resources for Oracle XE (needs at least 2GB RAM)
colima start --cpu 2 --memory 4 --disk 30

# Verify Docker is working
docker ps
```

> If you already have Colima running with less memory, run `colima stop` then restart with the flags above.

### Step 3 — Pull and Start Oracle XE

Oracle's container registry requires a **free account** before you can pull the image.

1. Create a free account at https://container-registry.oracle.com
2. Log in, navigate to **Database → express**, and click **Accept License Agreement**
3. Log in from your terminal:

```bash
docker login container-registry.oracle.com
# Enter your Oracle account email and password when prompted
```

4. Pull and run Oracle XE 21c:

```bash
docker run -d \
  --name oracle-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PWD=OraclePwd123 \
  container-registry.oracle.com/database/express:latest
```

5. Wait for it to be ready (takes 60–90 seconds on first start):

```bash
# Poll health status — wait for "healthy"
watch -n 5 'docker inspect --format="{{.State.Health.Status}}" oracle-xe'

# Or tail the logs directly
docker logs -f oracle-xe
# Look for: DATABASE IS READY TO USE!
```

Your database is now available at:
- **Connection string:** `localhost:1521/XE`
- **SYSTEM password:** `OraclePwd123`
- **Web UI (EM Express):** http://localhost:5500/em

> **Service name note:** Oracle XE 21c has two service names:
> - `XE` — the container database (CDB), used with the SYSTEM user
> - `XEPDB1` — the pluggable database (PDB), used for regular application users

To start and stop the database later:
```bash
docker start oracle-xe
docker stop oracle-xe
```

### Step 4 — Clone and Build the MCP Server

```bash
git clone https://github.com/tannerpace/mcp-oracle-database.git
cd mcp-oracle-database
npm install
npm run build
```

### Step 5 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` for local Oracle XE (good for trying it out):

```env
ORACLE_CONNECTION_STRING=localhost:1521/XE
ORACLE_USER=system
ORACLE_PASSWORD=OraclePwd123
```

For production use, create a dedicated read-only user first — see [Create a Read-Only User](#optional-create-a-read-only-user).

### Step 6 — Test the Server

```bash
# Core tests: connects to Oracle, queries schema and version
npm run test-client

# Schema discovery tool tests
npm run test-discovery
```

Expected output:
```
✅ All tests completed successfully!

📊 Test Summary:
1. List Tools: ✅
2. List Tables (fast): ✅
3. List Tables (with counts): ✅
4. Describe Table: ✅
5. Get Table Relations: ✅
6. Get Sample Values: ✅
7. Suggest Related Tables: ✅
8. Cache Test: ✅
```

### Step 7 — Connect VS Code

See [Configure VS Code](#-configure-vs-code) below.

---

## 📦 Installation

### Build from Source (Recommended)

Gives you the latest code and lets you run the test suite to verify everything works before connecting to Copilot.

```bash
git clone https://github.com/tannerpace/mcp-oracle-database.git
cd mcp-oracle-database
npm install
npm run build
```

### Install from npm

If you just want the server binary without cloning the source:

```bash
npm install -g mcp-oracle-database
```

---

## 🔌 Configure VS Code

### Option A — From Source (recommended)

Create `.vscode/mcp.json` in your VS Code workspace (or add to your global MCP config):

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

### Option B — From npm global install

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

After saving the config, reload VS Code and open a Copilot chat in **Agent mode**. Try:
```
"What tables are in the database?"
"Describe the HELP table"
"Show me 5 rows from the HELP table"
```

---

## Optional: Create a Read-Only User

Using `SYSTEM` is fine for local testing, but for any real database create a dedicated read-only user.

Connect to Oracle (e.g. via `sqlplus` or a GUI like DBeaver):

```sql
-- For Oracle XE local Docker, connect with:
-- sqlplus system/OraclePwd123@localhost:1521/XEPDB1

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

- 🔒 **Read-only access** — Uses a dedicated read-only database user for security
- 📡 **stdio transport** — Communicates via standard input/output (no HTTP server needed)
- ⚡ **Connection pooling** — Efficient Oracle connection management
- 📊 **Schema introspection** — Query table and column information
- 🔍 **Advanced schema discovery** — 5 specialized tools for discovering tables, relationships, and data patterns
- 💾 **In-memory caching** — Fast repeated access with LRU cache (5-minute TTL)
- 📝 **Audit logging** — All queries logged with execution metrics
- ⏱️ **Timeout protection** — Prevents long-running queries
- 🛡️ **Result limits** — Configurable row limits to prevent memory issues
- 🍎 **No Oracle Client needed** — Uses node-oracledb Thin Mode (pure JS, works on Apple Silicon)

## Architecture

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
Get table list or column details for a specific table.

```json
{ "tableName": "ORDERS" }
```

### Schema Discovery Tools

Five specialized tools for comprehensive schema introspection:

| Tool | Purpose | Cached |
|------|---------|--------|
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
2. **No Injection Protection** — The server trusts the LLM to generate valid SQL; the read-only user is the safety net
3. **Query Limits** — Row count and timeout limits prevent resource exhaustion
4. **Audit Logging** — All queries logged with timestamps for review
5. **Local Use** — This server is designed to run right on your machine; It can run locally, and still access remote databases.

---

## Troubleshooting

### Colima not running (macOS)

```bash
colima status
colima start --cpu 2 --memory 4   # Oracle needs at least 2GB RAM
docker ps                          # verify Docker is available
```

### Oracle container issues

```bash
# Check if container exists
docker ps -a | grep oracle-xe

# View startup logs
docker logs oracle-xe

# Already exists but stopped — just start it
docker start oracle-xe

# Check health status
docker inspect --format='{{.State.Health.Status}}' oracle-xe
# Wait for: healthy
```

### Connection failed

```
Error: ORA-12545: Connect failed because target host or object does not exist
```

- Is Oracle running? `docker ps | grep oracle-xe`
- Check the port is mapped: `docker ps` should show `0.0.0.0:1521->1521/tcp`
- Try `localhost:1521/XE` for SYSTEM user, `localhost:1521/XEPDB1` for other users

### Wrong service name

| Service | Use for |
|---------|---------|
| `localhost:1521/XE` | SYSTEM user, DBA operations |
| `localhost:1521/XEPDB1` | Regular application users |

### Permission denied

```
Error: ORA-00942: table or view does not exist
```

Grant SELECT to your user:
```sql
GRANT SELECT ANY TABLE TO your_user;
```

### Oracle container registry login required

```
Error: unauthorized: authentication required
```

1. Create a free account at https://container-registry.oracle.com
2. Accept the license for **Database → express**
3. Run `docker login container-registry.oracle.com`

### Response too large

```
Response for tool 'listTables' exceeded MCP_MAX_RESPONSE_CHARS
```

Raise the limit in `.env` or your VS Code MCP config:
```env
MCP_MAX_RESPONSE_CHARS=100000
```

### Thin Mode note

This project uses node-oracledb **Thin Mode** — a pure JavaScript driver that requires no Oracle Instant Client. It works on all platforms including Apple Silicon Macs.

---

## Documentation

📚 **Integration Guides:**
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

---

> Oracle is a registered trademark of Oracle Corporation.
> This project is not affiliated with, endorsed by, or sponsored by Oracle Corporation.

---

