# Claude Desktop Integration Guide

This guide shows you how to integrate the Oracle MCP Server with Claude Desktop, enabling Claude to query your Oracle database directly.

## Prerequisites

1. ✅ [Claude Desktop](https://claude.ai/download) installed
2. ✅ Oracle MCP Server built and tested
   ```bash
   npm run build
   npm run test-client
   ```
3. ✅ Oracle database running
   ```bash
   docker ps | grep oracle
   ```

## Configuration

Claude Desktop uses a configuration file to discover MCP servers.

### 1. Locate Configuration File

The configuration file location depends on your OS:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### 2. Edit Configuration

Create or edit the file with this content:

```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["/Users/yourname/path/to/my-mcp/dist/server.js"],
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

**Important:** 
- Replace `/Users/yourname/path/to/my-mcp` with your actual project path
- Use **absolute paths** (not relative like `./dist/server.js`)

### 3. Restart Claude Desktop

Close and reopen Claude Desktop for the configuration to take effect.

## Verification

### Check Server Status

1. Open Claude Desktop
2. Start a new conversation
3. Look for a tool/plugin icon (🔌 or similar)
4. You should see "oracle-db" listed as an available server

### Test Database Access

Try these prompts with Claude:

```
"What tools do you have access to?"
```

Claude should mention database query capabilities.

```
"List all tables in the database"
```

Claude should call `get_database_schema` and return table names.

```
"What version of Oracle are we running?"
```

Claude should query the database version.

## Example Interactions

### Schema Discovery
```
You: "What tables exist in our database?"

Claude: I'll use the get_database_schema tool to find out.

[Tool call: get_database_schema()]

Claude: Your Oracle database has 134 tables, including:
- EMPLOYEES
- DEPARTMENTS
- PRODUCTS
- ORDERS
- HELP
...

Would you like details about any specific table?
```

### Data Analysis
```
You: "Show me the structure of the EMPLOYEES table"

Claude: Let me get the schema for that table.

[Tool call: get_database_schema({ tableName: "EMPLOYEES" })]

Claude: The EMPLOYEES table has these columns:
- EMPLOYEE_ID (NUMBER) - Not Null
- FIRST_NAME (VARCHAR2(50))
- LAST_NAME (VARCHAR2(50)) - Not Null
- EMAIL (VARCHAR2(100)) - Not Null
- HIRE_DATE (DATE)
- SALARY (NUMBER(10,2))
- DEPARTMENT_ID (NUMBER)
```

### Complex Queries
```
You: "How many employees were hired in the last year?"

Claude: I'll query the employee hiring data.

[Tool call: query_database({
  query: "SELECT COUNT(*) as recent_hires FROM employees WHERE hire_date >= ADD_MONTHS(SYSDATE, -12)"
})]

Claude: There were 47 employees hired in the last year.
```

## Security Best Practices

### Use Read-Only Database User

Create a dedicated user with minimal privileges:

```sql
-- Connect as SYSDBA
CREATE USER claude_readonly IDENTIFIED BY "SecurePassword123";
GRANT CONNECT TO claude_readonly;
GRANT SELECT ON employees TO claude_readonly;
GRANT SELECT ON departments TO claude_readonly;
-- Add more tables as needed
```

Update configuration:
```json
{
  "env": {
    "ORACLE_USER": "claude_readonly",
    "ORACLE_PASSWORD": "SecurePassword123"
  }
}
```

### Use Environment Variables

Instead of hardcoding credentials in config:

**Option 1: Remove env section**
```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["/Users/yourname/path/to/my-mcp/dist/server.js"]
      // No env section - will use .env file in project
    }
  }
}
```

Create `.env` file in your project:
```bash
ORACLE_CONNECTION_STRING=localhost:1521/XEPDB1
ORACLE_USER=claude_readonly
ORACLE_PASSWORD=SecurePassword123
```

**Option 2: Use shell environment**
Set in `~/.zshrc` or `~/.bashrc`:
```bash
export ORACLE_CONNECTION_STRING="localhost:1521/XEPDB1"
export ORACLE_USER="claude_readonly"
export ORACLE_PASSWORD="SecurePassword123"
```

Restart terminal and Claude Desktop.

## Advanced Configuration

### Multiple Databases

You can connect Claude to multiple databases:

```json
{
  "mcpServers": {
    "oracle-production": {
      "command": "node",
      "args": ["/path/to/my-mcp/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "prod-db:1521/PROD",
        "ORACLE_USER": "readonly",
        "SERVER_NAME": "oracle-prod"
      }
    },
    "oracle-staging": {
      "command": "node",
      "args": ["/path/to/my-mcp/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "staging-db:1521/STAGING",
        "ORACLE_USER": "readonly",
        "SERVER_NAME": "oracle-staging"
      }
    }
  }
}
```

Claude will have access to both databases and you can specify which one to query.

### Performance Tuning

For large databases:

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

### Enable Debug Logging

For troubleshooting:

```json
{
  "env": {
    "LOG_LEVEL": "debug",
    "ENABLE_AUDIT_LOGGING": "true"
  }
}
```

Logs will be written to `logs/mcp-server.log` in your project directory.

## Troubleshooting

### Claude Doesn't See the Server

**Problem:** MCP server not listed in Claude Desktop

**Solutions:**
1. Check config file location is correct
2. Verify JSON syntax is valid (use [JSONLint](https://jsonlint.com/))
3. Use absolute paths in `args`
4. Restart Claude Desktop completely (not just new chat)
5. Check Claude Desktop logs (Help → Show Logs)

### Server Starts But Crashes

**Problem:** Server appears then disappears

**Solutions:**
1. Test manually: `node /path/to/dist/server.js`
2. Check `.env` file exists and is valid
3. Verify database is running: `docker ps | grep oracle`
4. Check connection string format: `host:port/service`
5. View logs: `tail -f logs/mcp-server.log`

### Database Queries Fail

**Problem:** Claude can't query database

**Solutions:**
1. Verify database user has SELECT privileges:
   ```sql
   SELECT * FROM user_tab_privs;
   ```
2. Test connection with sqlplus:
   ```bash
   sqlplus user/password@localhost:1521/XEPDB1
   ```
3. Check firewall allows connection to port 1521
4. Increase query timeout if queries are slow

### Permission Errors

**Problem:** "ORA-00942: table or view does not exist"

**Solutions:**
1. Grant SELECT on specific tables:
   ```sql
   GRANT SELECT ON schema.table_name TO your_user;
   ```
2. Or grant on all tables:
   ```sql
   GRANT SELECT ANY TABLE TO your_user;
   ```
3. Check table ownership and schema

## Complete Example Configuration

Here's a production-ready configuration:

```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["/Users/tan/GITHUB/my-mcp/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "localhost:1521/XEPDB1",
        "ORACLE_USER": "claude_readonly",
        "ORACLE_PASSWORD": "SecureReadOnlyPassword123",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000",
        "MAX_QUERY_LENGTH": "50000",
        "LOG_LEVEL": "info",
        "ENABLE_AUDIT_LOGGING": "true",
        "SERVER_NAME": "oracle-mcp-server",
        "SERVER_VERSION": "1.0.0"
      }
    }
  },
  "globalShortcut": "CommandOrControl+Shift+Space"
}
```

## Next Steps

- ✅ Test your integration with example queries
- 📖 Read [MCP Integration Guide](./MCP-INTEGRATION.md)
- 🔒 Set up a read-only database user
- 📊 View [test results](../test-results.md) for query examples
- 🔧 Tune [performance settings](../README.md#configuration)

## Resources

- [Claude Desktop Documentation](https://support.anthropic.com/en/collections/4078534-claude-desktop)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Claude MCP Integration Guide](https://modelcontextprotocol.io/tutorials/building-a-client)
- [node-oracledb Documentation](https://node-oracledb.readthedocs.io/)
