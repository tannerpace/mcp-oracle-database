# MCP (Model Context Protocol) Integration Guide

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI assistants like GitHub Copilot, Claude Desktop, and other LLM applications to securely connect to external data sources and tools. Think of it as a universal adapter that lets AI models interact with your databases, APIs, and services in a standardized way.

## How This Oracle MCP Server Works

This server implements the MCP protocol to expose Oracle database operations as **tools** that AI assistants can call. When configured, Copilot or Claude can:

1. **Query your database** - Execute SELECT queries to retrieve data
2. **Explore schema** - Discover tables, columns, and data types
3. **Understand your data model** - Help you write better queries by knowing the structure

### Architecture Overview

```
┌──────────────────────────────────────┐
│  AI Assistant (Copilot/Claude)      │
│  - Understands natural language      │
│  - Calls MCP tools as needed         │
└──────────────┬───────────────────────┘
               │
               │ MCP Protocol (JSON-RPC)
               │ via stdio transport
               │
┌──────────────▼───────────────────────┐
│  Oracle MCP Server (this project)   │
│  - Listens on stdin/stdout           │
│  - Exposes 2 tools:                  │
│    • query_database                  │
│    • get_database_schema             │
└──────────────┬───────────────────────┘
               │
               │ Oracle Client (Thin Mode)
               │
┌──────────────▼───────────────────────┐
│  Oracle Database                     │
│  - Read-only queries                 │
└──────────────────────────────────────┘
```

## Available MCP Tools

### 1. `query_database`

Execute a read-only SQL SELECT query against your Oracle database.

**Input Schema:**
```typescript
{
  query: string;        // SQL SELECT statement
  maxRows?: number;     // Limit results (default: 1000)
  timeout?: number;     // Query timeout in ms (default: 30000)
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    rows: Record<string, any>[];
    rowCount: number;
    columns: string[];
    executionTime: number;
  };
  error?: string;
}
```

**Example Usage by AI:**
```
User: "What are the top 5 products by sales?"

AI thinks: I need to query the database
AI calls: query_database({
  query: "SELECT product_name, SUM(sales) as total_sales 
          FROM products 
          GROUP BY product_name 
          ORDER BY total_sales DESC 
          FETCH FIRST 5 ROWS ONLY"
})

AI responds: "Here are the top 5 products by sales: [results]"
```

### 2. `get_database_schema`

Retrieve schema information about tables and columns.

**Input Schema:**
```typescript
{
  tableName?: string;  // Optional: specific table, or all tables if omitted
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    rows: Array<{
      TABLE_NAME?: string;
      TABLESPACE_NAME?: string;
      // OR when tableName specified:
      COLUMN_NAME?: string;
      DATA_TYPE?: string;
      DATA_LENGTH?: number;
      NULLABLE?: string;
    }>;
    rowCount: number;
    columns: string[];
    executionTime: number;
  };
  error?: string;
}
```

**Example Usage by AI:**
```
User: "What columns are in the employees table?"

AI calls: get_database_schema({ tableName: "EMPLOYEES" })

AI responds: "The employees table has these columns: 
  - EMPLOYEE_ID (NUMBER)
  - FIRST_NAME (VARCHAR2)
  - LAST_NAME (VARCHAR2)
  - EMAIL (VARCHAR2)
  - HIRE_DATE (DATE)
  - SALARY (NUMBER)"
```

## MCP Protocol Details

### Transport: stdio

This server uses **stdio transport**, meaning:
- **stdin** - Receives JSON-RPC requests from the AI client
- **stdout** - Sends JSON-RPC responses back to the client
- **stderr** - Used for logging (not sent to AI)

### Communication Flow

1. **Client spawns server process**
   ```bash
   node dist/server.js
   ```

2. **Client sends initialization request** (via stdin)
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "initialize",
     "params": {
       "protocolVersion": "2024-11-05",
       "clientInfo": {
         "name": "copilot",
         "version": "1.0.0"
       }
     }
   }
   ```

3. **Server responds** (via stdout)
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "result": {
       "protocolVersion": "2024-11-05",
       "serverInfo": {
         "name": "oracle-mcp-server",
         "version": "1.0.0"
       },
       "capabilities": {
         "tools": {}
       }
     }
   }
   ```

4. **Client requests tool list**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "tools/list"
   }
   ```

5. **Server returns available tools**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "result": {
       "tools": [
         {
           "name": "query_database",
           "description": "Execute a read-only SQL SELECT query",
           "inputSchema": { ... }
         },
         {
           "name": "get_database_schema",
           "description": "Get database schema information",
           "inputSchema": { ... }
         }
       ]
     }
   }
   ```

6. **Client calls a tool**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "method": "tools/call",
     "params": {
       "name": "query_database",
       "arguments": {
         "query": "SELECT * FROM employees WHERE department = 'Engineering'"
       }
     }
   }
   ```

7. **Server executes and returns results**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "result": {
       "content": [
         {
           "type": "text",
           "text": "{\"success\":true,\"data\":{\"rows\":[...],\"rowCount\":42}}"
         }
       ]
     }
   }
   ```

## Security & Best Practices

### Read-Only Access
- Use a **read-only database user** with SELECT-only privileges
- Configure at the database level, not just application level
- See [Database Setup Guide](../README.md#database-setup) for creating read-only users

### Query Limits
Configure these in `.env`:
```bash
QUERY_TIMEOUT_MS=30000      # 30 second timeout
MAX_ROWS_PER_QUERY=1000     # Max 1000 rows returned
MAX_QUERY_LENGTH=50000      # Max 50KB query size
```

### Audit Logging
All queries are logged with:
- Timestamp
- Query text
- Execution time
- Row count
- Success/failure status

Enable in `.env`:
```bash
ENABLE_AUDIT_LOGGING=true
LOG_LEVEL=info
```

### Connection Pooling
The server maintains a connection pool for efficiency:
```bash
ORACLE_POOL_MIN=2           # Minimum 2 connections
ORACLE_POOL_MAX=10          # Maximum 10 connections
```

## Testing Your MCP Server

### Using the Test Client

Run the included test client:
```bash
npm run test-client
```

This will:
1. ✅ List available tools
2. ✅ Get database schema (all tables)
3. ✅ Query Oracle version
4. ✅ Query current user and date
5. ✅ Query tablespace information
6. ✅ Get schema for a specific table

### Manual Testing with MCP Inspector

You can also use the official MCP Inspector tool:

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run inspector
mcp-inspector node dist/server.js
```

This opens a web UI where you can:
- View available tools
- Test tool calls manually
- Inspect JSON-RPC messages
- Debug protocol issues

## Troubleshooting

### Server Won't Start
**Problem:** Process exits immediately
**Solution:** Check environment variables in `.env`
```bash
# Verify config
node -e "import('./dist/config.js').then(c => console.log(c.getConfig()))"
```

### Database Connection Fails
**Problem:** "ORA-12541: TNS:no listener"
**Solution:** 
1. Ensure Oracle is running: `docker ps | grep oracle`
2. Check connection string format: `hostname:port/servicename`
3. Test with sqlplus: `sqlplus system/password@localhost:1521/XEPDB1`

### AI Can't See Tools
**Problem:** Copilot doesn't show database capabilities
**Solution:**
1. Check MCP configuration in VS Code settings
2. Restart VS Code/Copilot
3. Check server logs: look for "MCP server listening"

### Queries Timeout
**Problem:** Long-running queries fail
**Solution:**
1. Increase timeout: `QUERY_TIMEOUT_MS=60000` (60 seconds)
2. Optimize query with indexes
3. Add WHERE clause to limit results

## Next Steps

- [VS Code Integration Guide](./VSCODE-INTEGRATION.md) - Set up with GitHub Copilot
- [Claude Desktop Integration](./CLAUDE-INTEGRATION.md) - Set up with Claude Desktop
- [Advanced Configuration](../README.md#configuration) - Tune performance and security
- [Test Results](../test-results.md) - See example queries and results

## Resources

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP GitHub Repository](https://github.com/modelcontextprotocol)
- [Oracle node-oracledb Documentation](https://node-oracledb.readthedocs.io/)
