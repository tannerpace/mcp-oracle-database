# VS Code & GitHub Copilot Integration Guide

This guide shows you how to integrate the Oracle MCP Server with Visual Studio Code and GitHub Copilot, enabling Copilot to query your Oracle database directly.

## Prerequisites

Before integrating with VS Code, ensure:

1. ✅ Oracle MCP Server is built and working
   ```bash
   npm run build
   npm run test-client  # Should pass all tests
   ```

2. ✅ Oracle database is running and accessible
   ```bash
   docker ps | grep oracle  # Should show running container
   ```

3. ✅ VS Code with GitHub Copilot installed
   - [Install VS Code](https://code.visualstudio.com/)
   - [Install GitHub Copilot Extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)

## Integration Methods

There are several ways to integrate this MCP server with VS Code:

### Method 1: GitHub Copilot Agent Mode (Recommended)

GitHub Copilot is adding native MCP support through "Agent Mode". This is the simplest integration.

**Configuration:**

1. Open VS Code Settings (⌘+, on Mac, Ctrl+, on Windows/Linux)

2. Search for "Copilot MCP" or "Model Context Protocol"

3. Add your MCP server configuration:

```json
{
  "github.copilot.mcp.servers": {
    "oracle-db": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/yourname/path/to/my-mcp",
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XEPDB1",
        "ORACLE_USER": "system",
        "ORACLE_PASSWORD": "OraclePwd123",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000",
        "LOG_LEVEL": "info",
        "ENABLE_AUDIT_LOGGING": "true",
        "SERVER_NAME": "oracle-mcp-server",
        "SERVER_VERSION": "1.0.0"
      }
    }
  }
}
```

4. **Important:** Update the `cwd` path to your project location

5. Reload VS Code (⌘+R or Ctrl+R)

**Usage:**

Once configured, Copilot can automatically call your database tools:

```
You: "What tables do we have in the database?"
Copilot: [Calls get_database_schema tool]
Copilot: "You have 134 tables including..."

You: "Show me the structure of the EMPLOYEES table"
Copilot: [Calls get_database_schema with tableName: "EMPLOYEES"]
Copilot: "The EMPLOYEES table has these columns: ..."

You: "How many employees are in the Engineering department?"
Copilot: [Calls query_database with appropriate SQL]
Copilot: "There are 42 employees in Engineering"
```

### Method 2: Cline/Roo-Cline Extension

[Cline](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) (formerly Claude Dev) is a VS Code extension that supports MCP servers.

**Installation:**

1. Install Cline extension from VS Code Marketplace
2. Open Cline settings (Click Cline icon in sidebar)
3. Find "MCP Servers" configuration
4. Add server configuration:

```json
{
  "oracle-db": {
    "command": "node",
    "args": ["dist/server.js"],
    "cwd": "/Users/yourname/path/to/my-mcp",
    "env": {
      "ORACLE_CONNECTION_STRING": "localhost:1521/XEPDB1",
      "ORACLE_USER": "system",
      "ORACLE_PASSWORD": "OraclePwd123"
    }
  }
}
```

**Usage:**

Chat with Cline and it will use the database tools:
- "Cline, what tables are in our database?"
- "Cline, query the users table and show active users"

### Method 3: Continue.dev Extension

[Continue.dev](https://marketplace.visualstudio.com/items?itemName=Continue.continue) is another AI coding assistant that supports MCP.

**Installation:**

1. Install Continue extension
2. Open `~/.continue/config.json`
3. Add MCP server:

```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["/Users/yourname/path/to/my-mcp/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XEPDB1",
        "ORACLE_USER": "system",
        "ORACLE_PASSWORD": "OraclePwd123"
      }
    }
  }
}
```

## VS Code Settings File Location

Your VS Code settings file is located at:

- **macOS:** `~/Library/Application Support/Code/User/settings.json`
- **Windows:** `%APPDATA%\Code\User\settings.json`
- **Linux:** `~/.config/Code/User/settings.json`

You can also access it via:
1. Open Command Palette (⌘+Shift+P / Ctrl+Shift+P)
2. Type "Preferences: Open User Settings (JSON)"

## Example Configuration File

Here's a complete example `settings.json` with Oracle MCP server:

```json
{
  // Your existing VS Code settings...
  "editor.fontSize": 14,
  "workbench.colorTheme": "Dark+",
  
  // MCP Server Configuration
  "github.copilot.mcp.servers": {
    "oracle-db": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/tan/GITHUB/my-mcp",
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XEPDB1",
        "ORACLE_USER": "system",
        "ORACLE_PASSWORD": "OraclePwd123",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000",
        "LOG_LEVEL": "info",
        "ENABLE_AUDIT_LOGGING": "true"
      }
    }
  }
}
```

## Security Considerations

### ⚠️ Password in VS Code Settings

Storing passwords in VS Code settings is **not recommended** for production use. Consider these alternatives:

#### Option 1: Environment Variables (Recommended)

Don't put credentials in VS Code settings. Instead, load from your shell environment:

```json
{
  "github.copilot.mcp.servers": {
    "oracle-db": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/tan/GITHUB/my-mcp",
      "env": {}  // Empty - will inherit from shell
    }
  }
}
```

Then set environment variables in your shell:
```bash
# Add to ~/.zshrc or ~/.bashrc
export ORACLE_CONNECTION_STRING="localhost:1521/XEPDB1"
export ORACLE_USER="system"
export ORACLE_PASSWORD="OraclePwd123"
```

Restart VS Code to pick up new environment variables.

#### Option 2: .env File

The server automatically loads from `.env` file in the project directory:

```json
{
  "github.copilot.mcp.servers": {
    "oracle-db": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/tan/GITHUB/my-mcp"
      // No env section - will use .env file
    }
  }
}
```

Make sure `.env` is in `.gitignore`!

#### Option 3: Read-Only User

Create a dedicated read-only database user with minimal privileges:

```sql
-- Connect as SYSDBA
CREATE USER copilot_readonly IDENTIFIED BY "SecurePassword123";
GRANT CONNECT TO copilot_readonly;
GRANT SELECT ANY TABLE TO copilot_readonly;
-- Or grant on specific tables only:
-- GRANT SELECT ON employees TO copilot_readonly;
-- GRANT SELECT ON products TO copilot_readonly;
```

Use this user in your configuration:
```json
{
  "env": {
    "ORACLE_USER": "copilot_readonly",
    "ORACLE_PASSWORD": "SecurePassword123"
  }
}
```

## Verifying Integration

### 1. Check Server Starts

After configuring, open VS Code Output panel:
1. View → Output (⌘+Shift+U / Ctrl+Shift+U)
2. Select "GitHub Copilot" or "MCP" from dropdown
3. Look for: `MCP server listening on stdio`

### 2. Test Tool Discovery

In VS Code, open Copilot Chat and ask:
```
"What tools do you have access to?"
```

Copilot should mention database-related capabilities.

### 3. Test Database Query

Try a simple query:
```
"What version of Oracle database are we using?"
```

Copilot should call `query_database` tool and return the version.

### 4. Check Logs

Server logs go to `logs/mcp-server.log` (if configured). Check for:
```json
{
  "level": "info",
  "message": "Query executed successfully",
  "query": "SELECT * FROM v$version",
  "executionTime": 150,
  "rowCount": 1
}
```

## Example Copilot Interactions

Once integrated, you can have conversations like:

### Schema Discovery
```
You: "What tables exist in our database?"

Copilot: Let me check the database schema for you.
[Calls: get_database_schema()]

Copilot: Your database has 134 tables, including:
- EMPLOYEES
- DEPARTMENTS  
- PRODUCTS
- ORDERS
...
```

### Data Queries
```
You: "How many active users do we have?"

Copilot: I'll query the users table.
[Calls: query_database({ query: "SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE'" })]

Copilot: You have 1,247 active users.
```

### Schema Inspection
```
You: "What's the structure of the products table?"

Copilot: Let me get the schema for that table.
[Calls: get_database_schema({ tableName: "PRODUCTS" })]

Copilot: The PRODUCTS table has these columns:
- PRODUCT_ID (NUMBER) - Primary Key
- PRODUCT_NAME (VARCHAR2(100))
- PRICE (NUMBER(10,2))
- CATEGORY (VARCHAR2(50))
- CREATED_DATE (DATE)
```

### Writing Queries
```
You: "Write a query to find top 10 selling products"

Copilot: Based on the schema, here's the query:
[Calls: get_database_schema({ tableName: "PRODUCTS" })]
[Calls: get_database_schema({ tableName: "SALES" })]

Copilot: 
SELECT p.product_name, SUM(s.quantity) as total_sold
FROM products p
JOIN sales s ON p.product_id = s.product_id
GROUP BY p.product_name
ORDER BY total_sold DESC
FETCH FIRST 10 ROWS ONLY

Would you like me to execute this query?
```

## Troubleshooting

### Copilot Doesn't See Database Tools

**Problem:** Copilot doesn't mention database capabilities

**Solutions:**
1. Check VS Code settings are saved correctly
2. Reload VS Code window (⌘+R / Ctrl+R)
3. Check Output panel for errors
4. Verify server path is absolute, not relative
5. Check server starts manually: `npm run test-client`

### Server Crashes on Startup

**Problem:** MCP server exits immediately

**Solutions:**
1. Check `.env` file exists and has correct values
2. Run manually to see error: `node dist/server.js`
3. Verify Oracle database is running: `docker ps`
4. Check connection string format: `host:port/service`

### Connection Pool Errors

**Problem:** "NJS-064: connection pool is closing"

**Solutions:**
1. This error during shutdown is harmless (known issue)
2. If it happens during queries, increase pool size:
   ```json
   "ORACLE_POOL_MAX": "20"
   ```
3. Check database max connections:
   ```sql
   SELECT name, value FROM v$parameter WHERE name = 'processes';
   ```

### Queries Return No Data

**Problem:** Queries execute but return empty results

**Solutions:**
1. Check user has SELECT privileges:
   ```sql
   SELECT * FROM user_tab_privs WHERE grantee = 'SYSTEM';
   ```
2. Verify table names (Oracle is case-sensitive):
   ```sql
   SELECT table_name FROM user_tables;
   ```
3. Check row limits: increase `MAX_ROWS_PER_QUERY`

## Custom Instructions for Copilot

In addition to MCP tools, you can provide custom instructions to help Copilot understand your database schema and coding practices. Custom instructions are Markdown files that automatically influence how Copilot generates code.

### Create `.github/copilot-instructions.md`

Create a file at `.github/copilot-instructions.md` in your project root:

```markdown
# Oracle Database Guidelines

## Database Information
- Database Type: Oracle Database 21c Express Edition
- Connection: Via MCP server (use MCP tools for queries)
- Access: Read-only user with SELECT privileges only

## Available MCP Tools
When working with database queries, you have access to these tools:
- `query_database`: Execute SELECT queries against Oracle
- `get_database_schema`: Get table and column information

## Coding Practices
- Always use parameterized queries to prevent SQL injection
- Prefer using the MCP tools over writing raw SQL strings
- Check schema first before writing complex queries
- Limit result sets with appropriate WHERE clauses
- Use proper error handling for database operations

## Example Usage
When asked to query the database:
1. First use `get_database_schema` to understand table structure
2. Then use `query_database` with appropriate SELECT statement
3. Always include row limits for large tables
```

Save this file and Copilot will automatically use these instructions when generating code.

### Instructions for Specific Files

Create `.instructions.md` files for language-specific guidance:

**`.github/instructions/typescript.instructions.md`:**
```markdown
---
applyTo: "**/*.ts"
description: TypeScript coding standards for Oracle MCP project
---

# TypeScript Guidelines for Oracle MCP

- Use explicit type annotations for all function parameters and return types
- Prefer `interface` over `type` for object shapes
- Use `async/await` over promises for database operations
- Always handle errors with try/catch blocks
- Import types from `oracledb` package when working with database code
- Use Zod for runtime validation of configuration and inputs
```

**`.github/instructions/sql.instructions.md`:**
```markdown
---
applyTo: "**/*.sql"
description: SQL coding standards for Oracle
---

# SQL Guidelines

- Write SQL keywords in UPPERCASE (SELECT, FROM, WHERE, etc.)
- Use meaningful table aliases (e.g., `e` for employees, not `t1`)
- Always include explicit column lists (avoid SELECT *)
- Use FETCH FIRST n ROWS ONLY instead of ROWNUM when possible
- Include comments for complex queries
- Format multi-line queries with proper indentation
```

### Enable Custom Instructions

1. Open VS Code Settings (⌘+, or Ctrl+,)
2. Search for "copilot instructions"
3. Enable `github.copilot.chat.codeGeneration.useInstructionFiles`

Or add to `settings.json`:
```json
{
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "chat.instructionsFilesLocations": [
    ".github/instructions"
  ]
}
```

### Manually Attach Instructions

You can also manually attach instruction files to specific prompts:
1. In Copilot Chat, click the "+" button
2. Select "Add Context" → "Instructions"
3. Choose the relevant instruction file

## Advanced Configuration

### Multiple Databases

You can configure multiple MCP servers for different databases:

```json
{
  "github.copilot.mcp.servers": {
    "oracle-production": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/my-mcp",
      "env": {
        "ORACLE_CONNECTION_STRING": "prod-db:1521/PROD",
        "ORACLE_USER": "readonly_user"
      }
    },
    "oracle-staging": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/my-mcp",
      "env": {
        "ORACLE_CONNECTION_STRING": "staging-db:1521/STAGING",
        "ORACLE_USER": "readonly_user"
      }
    }
  }
}
```

Copilot will have access to both databases.

### Custom Server Name

Make it easier to identify in logs:

```json
{
  "env": {
    "SERVER_NAME": "oracle-prod-mcp",
    "SERVER_VERSION": "1.0.0"
  }
}
```

### Performance Tuning

For better performance with large result sets:

```json
{
  "env": {
    "ORACLE_POOL_MIN": "5",
    "ORACLE_POOL_MAX": "20",
    "QUERY_TIMEOUT_MS": "60000",
    "MAX_ROWS_PER_QUERY": "5000"
  }
}
```

## Next Steps

- ✅ [Test your integration](#verifying-integration)
- 📖 [Read MCP Integration Guide](./MCP-INTEGRATION.md)
- 🔧 [Tune performance settings](../README.md#configuration)
- 🔒 [Set up read-only database user](#option-3-read-only-user)
- 📊 [View test results](../test-results.md)

## Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [VS Code Settings Reference](https://code.visualstudio.com/docs/getstarted/settings)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [node-oracledb Documentation](https://node-oracledb.readthedocs.io/)
