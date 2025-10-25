# Quick Start: Oracle MCP with VS Code

Get GitHub Copilot talking to your Oracle database in 3 steps.

## Prerequisites

- ✅ Node.js v18.17.0 or later
- ✅ VS Code with GitHub Copilot extension
- ✅ Oracle Database (local or remote)

## Step 1: Build the MCP Server

```bash
npm install
npm run build
```

This compiles the TypeScript MCP server to `dist/server.js`.

## Step 2: Configure VS Code

Create `.vscode/mcp.json` from the template:

```bash
cp .vscode/mcp.json.example .vscode/mcp.json
```

**Option A: Use Input Variables (Recommended)**

Keep the file as-is. VS Code will prompt for credentials when the server starts.

**Option B: Use .env File (Quick Setup)**

Edit `.vscode/mcp.json`:

```json
{
  "servers": {
    "oracleDatabase": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/server.js"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

Then create `.env`:

```bash
cp .env.example .env
# Edit .env with your credentials
```

## Step 3: Start Using It

1. **Start your Oracle database** (if using Docker):
   ```bash
   docker start oracle-xe
   ```

2. **Reload VS Code window**:
   - Command Palette (⇧⌘P) → "Developer: Reload Window"

3. **Verify MCP server is running**:
   - Open Extensions view (⇧⌘X)
   - Look for "MCP SERVERS" section
   - Should see "oracleDatabase" listed

4. **Ask Copilot a question**:
   - Open Copilot Chat (⌘I or Chat view)
   - Try: `"What tables are in the database?"`

## Example Queries

Once configured, you can ask Copilot:

### Schema Discovery
```
What tables exist in our Oracle database?
```

Expected: Copilot invokes `get_database_schema()` and lists all tables.

### Table Details
```
Show me the structure of the EMPLOYEES table
```

Expected: Copilot invokes `get_database_schema({tableName: "EMPLOYEES"})` and displays columns.

### SQL Execution
```
What version of Oracle are we running?
```

Expected: Copilot invokes `query_database()` with `SELECT * FROM v$version`.

### Data Analysis
```
Show me all tablespaces and their sizes
```

Expected: Copilot constructs appropriate query and executes it.

## Verifying It Works

### Check MCP Server Status

Command Palette → "MCP: List Servers"

You should see:
- **Server Name**: oracleDatabase
- **Status**: Running ✅
- **Tools**: 2 (query_database, get_database_schema)

Click "Show Output" to see server logs.

### Check Tools Are Available

Click the **Configure Tools** button in the Chat input area.

You should see:
- ☑️ query_database - Execute SQL queries
- ☑️ get_database_schema - Get database schema information

### Test Tool Invocation

Ask Copilot:
```
Query the database version using #query_database
```

This forces Copilot to use the tool. You should see:
1. Tool approval dialog (first time)
2. Query parameter shown
3. Results displayed

## Troubleshooting

### MCP Server Not Appearing

**Check:**
- `.vscode/mcp.json` exists and is valid JSON
- Server was built: `ls dist/server.js` should exist
- Reload VS Code window

**Fix:**
```bash
npm run build
# Command Palette → "Developer: Reload Window"
```

### Tools Not Available

**Check:**
- Configure Tools shows both tools checked
- MCP server status is "Running"

**Fix:**
```bash
# Command Palette → "MCP: Reset Cached Tools"
# Command Palette → "MCP: List Servers" → Select oracleDatabase → "Restart"
```

### Connection Errors

**Check:**
- Oracle database is running: `docker ps | grep oracle`
- Credentials are correct in `.env` or input variables
- Connection string format: `host:port/service`

**Test connection:**
```bash
npm run test-client
```

If test client works but VS Code doesn't, check MCP server output logs.

### Permission Errors

**Check:**
- Database user has SELECT privileges
- User can access system views like `v$version`

**Grant permissions:**
```sql
GRANT SELECT ANY TABLE TO your_user;
GRANT SELECT ON v_$version TO your_user;
```

## Next Steps

- Read [VS Code Integration Guide](./VSCODE-INTEGRATION.md) for advanced configuration
- See [MCP Integration Guide](./MCP-INTEGRATION.md) for tool details
- Check [Custom Instructions](./.github/copilot-instructions.md) to understand how Copilot uses the tools

## Security Notes

⚠️ **Never commit `.vscode/mcp.json` if it contains credentials!**

Already protected:
- `.vscode/mcp.json` is in `.gitignore`
- `.env` is in `.gitignore`

Use input variables for shared workspaces (recommended setup).

---

**Need help?** Check the [Troubleshooting Guide](./VSCODE-AGENT-MODE-PLAN.md#phase-8-troubleshooting-guide)
