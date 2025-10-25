# Oracle Database MCP Server

A Model Context Protocol (MCP) server that enables GitHub Copilot and other LLMs to execute read-only SQL queries against an Oracle database.

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
2. **Oracle Instant Client** (required by node-oracledb)
3. **Oracle Database** with a read-only user created

### Installing Oracle Instant Client

**macOS** (using Homebrew):
```bash
brew tap homebrew/cask
brew install --cask oracle-instant-client
```

**Linux**:
Download from [Oracle Instant Client Downloads](https://www.oracle.com/database/technologies/instant-client/downloads.html)

**Windows**:
Download from [Oracle Instant Client Downloads](https://www.oracle.com/database/technologies/instant-client/downloads.html)

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
npm run build      # Compile TypeScript
npm run dev        # Watch mode compilation
npm run clean      # Remove dist folder
npm run typecheck  # Type check without compiling
npm start          # Run the server (after building)
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

### Oracle Client Not Found

```
Error: DPI-1047: Cannot locate a 64-bit Oracle Client library
```

**Solution:** Install Oracle Instant Client (see Prerequisites above).

### Connection Failed

```
Error: ORA-12545: Connect failed because target host or object does not exist
```

**Solution:** Check your `ORACLE_CONNECTION_STRING` format: `hostname:port/servicename`

### Permission Denied

```
Error: ORA-00942: table or view does not exist
```

**Solution:** Grant SELECT privileges to your read-only user on the required tables.

## License

ISC

## Contributing

Contributions welcome! Please open an issue or pull request.
