# Database MCP Server

A Model Context Protocol (MCP) server that enables GitHub Copilot and other LLMs to execute read-only SQL queries against Oracle databases.

[![npm version](https://badge.fury.io/js/mcp-oracle-database.svg)](https://www.npmjs.com/package/mcp-oracle-database)
[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

<a href="https://glama.ai/mcp/servers/@tannerpace/mcp-oracle-database">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@tannerpace/mcp-oracle-database/badge" alt="Oracle Database Server MCP server" />
</a>

## 📦 Installation

### From npm (Recommended)

```bash
npm install -g mcp-oracle-database
```

Or install locally in your project:

```bash
npm install mcp-oracle-database
```

### From Source

```bash
git clone https://github.com/tannerpace/my-mcp.git
cd my-mcp
npm install && npm run build
```

## �🚀 Quick Start with VS Code

### If installed via npm:

1. **Configure VS Code MCP settings**

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "oracleDatabase": {
      "type": "stdio",
      "command": "mcp-database-server",
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XEPDB1",
        "ORACLE_USER": "your_readonly_user",
        "ORACLE_PASSWORD": "your_password",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000"
      }
    }
  }
}
```

2. **Reload VS Code and ask Copilot:**
```
"What tables are in the database?"
```

### If running from source:

```bash
# 1. Build the server
npm install && npm run build

# 2. Configure VS Code
cp .vscode/mcp.json.example .vscode/mcp.json

# 3. Start Oracle database (if using Docker)
docker start oracle-xe

# 4. Reload VS Code and ask Copilot:
"What tables are in the database?"
```

See [Quick Start Guide](./docs/QUICK-START-VSCODE.md) for detailed setup.

## 🏗️ Build Your Own MCP Server

Want to create your own MCP server for a different data source? This repository serves as a **reference architecture** for building MCP servers!

**📝 [MCP Project Generator](./MCP-PROJECT-GENERATOR-PROMPT.md)** - Use our comprehensive prompt templates to generate:
- New MCP tools for this server
- Standalone MCP servers for PostgreSQL, MongoDB, GitHub, Slack, REST APIs, and more
- Custom integrations for your specific needs

**⚡ [Quick Start Generator](./QUICK-START-GENERATOR.md)** - 5-minute copy-paste guide for macOS/VS Code

**🎯 [Ready-to-Use Examples](./MCP-GENERATOR-EXAMPLES.md)** - Pre-built prompts for common use cases

## Features

- 🔒 **Read-only access** - Uses a dedicated read-only database user for security
- 📡 **stdio transport** - Communicates via standard input/output (no HTTP server needed)
- ⚡ **Connection pooling** - Efficient Oracle connection management
- 📊 **Schema introspection** - Query table and column information
- 📝 **Audit logging** - All queries are logged with execution metrics
- ⏱️ **Timeout protection** - Prevents long-running queries
- 🛡️ **Result limits** - Configurable row limits to prevent memory issues

## Architecture

```
GitHub Copilot
      ↓ (MCP Protocol)
  MCP Client (spawns process)
      ↓ (JSON-RPC over stdio)
  MCP Server (Node.js)
      ↓ (oracledb)
  Oracle DB (read-only user)
```

## Prerequisites

1. **Node.js** v18 or higher
2. **Oracle Database** with a read-only user created
   - Running locally (Docker recommended)
   - Or accessible remote instance

**Note:** This project uses the node-oracledb package in **Thin Mode**, which means **no Oracle Instant Client installation is required**! The pure JavaScript driver connects directly to Oracle Database, just like Python's oracledb library.

### Optional: Running Oracle Database Locally with Docker

If you need a local Oracle database for development:

**macOS (using Colima):**
```bash
# Start Colima (Docker runtime for macOS)
colima start

# Pull and run Oracle XE container
docker run -d \
  --name oracle-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PWD=OraclePwd123 \
  container-registry.oracle.com/database/express:latest

# Wait for database to be ready (takes 1-2 minutes)
docker logs -f oracle-xe

# Start/stop the database later
docker start oracle-xe
docker stop oracle-xe
```

**Linux/Other:**
```bash
# Same docker commands as above, just ensure Docker is running
docker ps
```

The database will be available at:
- **Connection:** `localhost:1521/XEPDB1`
- **SYS password:** `OraclePwd123`
- **Web UI:** http://localhost:5500/em

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd my-mcp
npm install
```

### 2. Create Read-Only Database User

Connect to your Oracle database as a DBA and run:

```sql
-- Create read-only user
CREATE USER readonly_user IDENTIFIED BY secure_password;

-- Grant connect and read-only privileges
GRANT CONNECT TO readonly_user;
GRANT SELECT ANY TABLE TO readonly_user;

-- Or grant access to specific tables only:
GRANT SELECT ON schema.table1 TO readonly_user;
GRANT SELECT ON schema.table2 TO readonly_user;
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set your Oracle connection details:

```env
# Oracle Database Connection (READ-ONLY USER)
ORACLE_CONNECTION_STRING=hostname:1521/servicename
ORACLE_USER=readonly_user
ORACLE_PASSWORD=secure_password

# Connection Pool Settings
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10

# Query Settings
QUERY_TIMEOUT_MS=30000
MAX_ROWS_PER_QUERY=1000
MAX_QUERY_LENGTH=50000

# Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
ENABLE_FILE_LOGGING=true
LOG_DIR=./logs
NODE_ENV=development
```

### 4. Build the Server

```bash
npm run build
```

### 5. Configure GitHub Copilot / MCP Client

Create or update your MCP client configuration file:

**VS Code** (`cline_mcp_config.json` or similar):
```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "hostname:1521/servicename",
        "ORACLE_USER": "readonly_user",
        "ORACLE_PASSWORD": "secure_password"
      }
    }
  }
}
```

Or use environment variables from your shell:
```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp/dist/server.js"]
    }
  }
}
```

## Usage

Once configured, the MCP server provides two tools to GitHub Copilot:

### Testing with the Built-in Client

Before integrating with Copilot, you can test the server locally:

```bash
# Make sure you have .env configured with valid Oracle credentials
npm run build
npm run test-client
```

This will:
1. Start the MCP server
2. Connect to it via the test client
3. List available tools
4. Get database schema (list all tables)
5. Disconnect and shut down

Edit `src/client.ts` to customize the test queries.

### Using with GitHub Copilot

Once configured, the MCP server provides two tools to GitHub Copilot:

### 1. `query_database`

Execute read-only SQL queries:

```
User: "Show me the top 10 customers by revenue"
Copilot: [calls query_database with SQL query]
```

**Parameters:**
- `query` (required): SQL SELECT statement
- `maxRows` (optional): Maximum rows to return
- `timeout` (optional): Query timeout in milliseconds

**Example:**
```json
{
  "query": "SELECT customer_name, SUM(revenue) as total FROM customers GROUP BY customer_name ORDER BY total DESC",
  "maxRows": 10
}
```

### 2. `get_database_schema`

Get schema information:

```
User: "What columns are in the CUSTOMERS table?"
Copilot: [calls get_database_schema with tableName="CUSTOMERS"]
```

**Parameters:**
- `tableName` (optional): Specific table name, or omit to list all tables

## Example Prompts for Copilot

- "List all tables in the database"
- "Show me the schema of the ORDERS table"
- "How many active users do we have?"
- "What are the top 5 products by sales this month?"
- "Show me recent transactions for customer ID 12345"

## Development

### Project Structure

```
my-mcp/
├── src/
│   ├── server.ts              # Main MCP server entry point
│   ├── client.ts              # Test client for local testing
│   ├── config.ts              # Configuration with Zod validation
│   ├── database/
│   │   ├── types.ts           # TypeScript types
│   │   ├── oracleConnection.ts # Connection pool manager
│   │   └── queryExecutor.ts   # Query execution logic
│   ├── tools/
│   │   ├── queryDatabase.ts   # query_database tool
│   │   └── getSchema.ts       # get_database_schema tool
│   └── logging/
│       └── logger.ts          # Winston-based logging
├── dist/                      # Compiled JavaScript (generated)
├── .env                       # Environment variables (git ignored)
├── .env.example               # Environment template
└── package.json
```

### Scripts

```bash
npm run build       # Compile TypeScript
npm run dev         # Watch mode compilation
npm run clean       # Remove dist folder
npm run typecheck   # Type check without compiling
npm start           # Run the server (after building)
npm run test-client # Run test client to verify server works
```

### Logging

All queries and events are logged in JSON format. Logs go to stdout/stderr:

```json
{
  "level": "info",
  "message": "Query executed successfully",
  "timestamp": "2025-10-24T10:30:00.000Z",
  "audit": true,
  "query": "SELECT * FROM customers WHERE...",
  "rowCount": 42,
  "executionTime": 156
}
```

Set `LOG_LEVEL=debug` in `.env` for more verbose logging.

## Security Considerations

1. **Read-Only User** - Database user has only SELECT privileges
2. **Local Client** - Designed for trusted local use only
3. **No Injection Protection** - Trust the LLM to generate valid queries
4. **Query Limits** - Row count and timeout limits prevent resource exhaustion
5. **Audit Logging** - All queries logged for review

## Troubleshooting

### Docker/Colima Issues (macOS)

**Docker not running:**
```bash
# Check if Colima is running
colima status

# Start Colima if needed
colima start

# Verify Docker works
docker ps
```

**Database won't start:**
```bash
# Check container status
docker ps -a | grep oracle

# View logs
docker logs oracle-xe

# Restart if needed
docker restart oracle-xe
```

### Connection Failed

```
Error: ORA-12545: Connect failed because target host or object does not exist
```

**Solutions:**
- Check your `ORACLE_CONNECTION_STRING` format: `hostname:port/servicename`
- For local Docker: use `localhost:1521/XEPDB1`
- Verify database is running: `docker ps | grep oracle`

### Permission Denied

```
Error: ORA-00942: table or view does not exist
```

**Solution:** Grant SELECT privileges to your read-only user on the required tables.

### Database Not Ready

If the test client fails immediately after starting the database:
- Wait 1-2 minutes for Oracle to fully initialize
- Check health status: `docker ps` should show `(healthy)`
- Watch startup logs: `docker logs -f oracle-xe`

### Thin Mode vs Thick Mode

This project uses **Thin Mode** (pure JavaScript, no Oracle Client needed). If you encounter issues and want to use Thick Mode:

1. Install Oracle Instant Client
2. Add to your code: `oracledb.initOracleClient()` before creating the pool

For most use cases, Thin Mode is simpler and works great!

## Documentation

📚 **Integration Guides:**
- [MCP Integration Guide](./docs/MCP-INTEGRATION.md) - Learn about MCP protocol, tools, and how it works
- [VS Code Integration Guide](./docs/VSCODE-INTEGRATION.md) - Set up with GitHub Copilot (includes custom instructions)
- [Claude Desktop Integration Guide](./docs/CLAUDE-INTEGRATION.md) - Set up with Claude Desktop
- [Quick Start Guide](./docs/QUICK-START-VSCODE.md) - Get started with VS Code in 3 steps ⚡
- [VS Code Agent Mode Plan](./docs/VSCODE-AGENT-MODE-PLAN.md) - Implementation details and troubleshooting

🏗️ **MCP Project Generator:**
- [**📚 Generator Documentation Index**](./docs/GENERATOR-INDEX.md) - Start here! Complete navigation guide
- [**Quick Start Generator**](./QUICK-START-GENERATOR.md) - ⚡ 5-minute guide with copy-paste prompts  
- [**Generator Examples**](./MCP-GENERATOR-EXAMPLES.md) - 🎯 Ready-to-use prompts for PostgreSQL, GitHub, MongoDB, Slack, and more
- [**MCP Project Generator Prompt**](./MCP-PROJECT-GENERATOR-PROMPT.md) - 📝 Comprehensive guide to generate new MCP tools and projects
- [**Generator Usage Examples**](./docs/GENERATOR-USAGE-EXAMPLES.md) - 🧪 Validation and testing guide

📊 **Test Results:**
- [Test Results](./test-results.md) - Comprehensive test results with example queries

📝 **Custom Instructions:**
- [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) - Project-wide Copilot instructions
- [`.github/instructions/`](./.github/instructions/) - Language-specific coding guidelines


Oracle is a registered trademark of Oracle Corporation.
This project is not affiliated with, endorsed by, or sponsored by Oracle Corporation.



## Contributing

Contributions welcome! Please open an issue or pull request.
