# VS Code Agent Mode Integration Plan

## Overview
This plan outlines how to configure our Oracle MCP server as a tool in VS Code's agent mode, enabling GitHub Copilot to automatically use our `query_database` and `get_database_schema` tools when working with Oracle databases.

## Current State
- ✅ MCP server implementation complete (`src/server.ts`)
- ✅ Two MCP tools defined:
  - `query_database` - Execute SELECT queries
  - `get_database_schema` - Get table/column information
- ✅ Test client validates functionality (`src/client.ts`)
- ✅ Oracle database running in Docker
- ✅ All tests passing

## Target State
- GitHub Copilot in VS Code can automatically invoke our Oracle database tools
- Users can ask natural language questions about the database
- Tools are available in agent mode with proper configuration
- Tools can be explicitly referenced with `#query_database` or `#get_database_schema`

---

## Implementation Plan

### Phase 1: MCP Server Configuration File

#### 1.1 Create Workspace `mcp.json`
**Location:** `.vscode/mcp.json` (workspace-level) OR user-level config

**Purpose:** Register our Oracle MCP server with VS Code

**Configuration Structure:**
```json
{
  "servers": {
    "oracleDatabase": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "${input:oracleConnectionString}",
        "ORACLE_USER": "${input:oracleUser}",
        "ORACLE_PASSWORD": "${input:oraclePassword}",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10",
        "QUERY_TIMEOUT_MS": "30000",
        "MAX_ROWS_PER_QUERY": "1000",
        "LOG_LEVEL": "info",
        "ENABLE_AUDIT_LOGGING": "true"
      }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "oracleConnectionString",
      "description": "Oracle connection string (host:port/service)",
      "default": "localhost:1521/XEPDB1"
    },
    {
      "type": "promptString",
      "id": "oracleUser",
      "description": "Oracle database username",
      "default": "system"
    },
    {
      "type": "promptString",
      "id": "oraclePassword",
      "description": "Oracle database password",
      "password": true
    }
  ]
}
```

**Key Features:**
- Uses `stdio` transport (standard MCP pattern)
- Spawns Node.js process with our compiled server
- Uses `${workspaceFolder}` variable for portability
- Prompts for credentials securely with input variables
- Sets environment variables for server configuration

**Security Considerations:**
- Passwords are marked as `password: true` (hidden input)
- Values stored securely by VS Code
- Not committed to git (`.vscode/mcp.json` should be in `.gitignore`)

---

### Phase 2: Alternative Configuration Options

#### Option 2A: Use Existing `.env` File
Instead of input variables, reference the workspace `.env` file:

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

**Pros:**
- No password prompts
- Reuses existing configuration
- Simpler setup

**Cons:**
- Requires `.env` file in workspace
- Less portable across machines
- Need to ensure `.env` is not committed

#### Option 2B: User-Level Configuration
For personal use across all workspaces:

**Location:** User settings `mcp.json` (stored in VS Code user profile)

**Access via:** Command Palette → "MCP: Open User Configuration"

```json
{
  "servers": {
    "oracleDatabase": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/tan/GITHUB/my-mcp/dist/server.js"],
      "envFile": "/Users/tan/GITHUB/my-mcp/.env"
    }
  }
}
```

**Note:** Requires absolute paths (no `${workspaceFolder}`)

---

### Phase 3: Tool Discovery & Registration

#### 3.1 VS Code Tool Discovery Process
When the MCP server starts, VS Code:
1. Spawns the server process (`node dist/server.js`)
2. Sends MCP initialization handshake
3. Calls `tools/list` to discover available tools
4. Caches tool definitions
5. Makes tools available in agent mode

#### 3.2 Tool Naming Convention
Our tools will appear as:
- `query_database` - Direct tool name
- `get_database_schema` - Direct tool name
- Can be referenced in chat with `#query_database` or `#get_database_schema`

#### 3.3 Clear Cached Tools
If tools don't appear after configuration:
- Command Palette → "MCP: Reset Cached Tools"
- Restart MCP server: "MCP: List Servers" → "Restart"

---

### Phase 4: Usage Patterns

#### 4.1 Agent Mode (Automatic)
Copilot automatically invokes tools based on natural language:

**User asks:**
```
"What tables are in the database?"
```

**Copilot internally:**
1. Detects database-related question
2. Sees `get_database_schema` tool is available
3. Invokes tool automatically
4. Returns formatted results

**User asks:**
```
"Show me all employees hired in the last 6 months"
```

**Copilot internally:**
1. Uses `get_database_schema` to find EMPLOYEES table structure
2. Constructs appropriate SQL query
3. Invokes `query_database` with the query
4. Formats and returns results

#### 4.2 Explicit Tool Reference
Users can force tool usage with `#`:

```
"Get all tablespaces #query_database"
```

Or in code comments:
```sql
-- #query_database
-- Show me the database version
```

#### 4.3 Tool Approval Flow
First time a tool is used:
1. VS Code shows approval dialog
2. Displays tool parameters
3. User can:
   - Allow once
   - Allow for session
   - Allow for workspace
   - Always allow
   - Edit parameters before running

---

### Phase 5: Tool Sets (Optional Enhancement)

#### 5.1 Create Database Tool Set
Group our Oracle tools together:

**File:** `.vscode/tool-sets.jsonc`

```jsonc
{
  "databaseAdmin": {
    "tools": ["query_database", "get_database_schema"],
    "description": "Oracle database query and schema tools",
    "icon": "database"
  }
}
```

**Usage:**
```
"Analyze database schema for performance issues #databaseAdmin"
```

Benefits:
- Enable/disable both tools together
- Easier to reference in prompts
- Better organization with many MCP servers

---

### Phase 6: Integration with Custom Instructions

Our existing `.github/copilot-instructions.md` will guide Copilot on **how** to use the tools.

**Example workflow Copilot will follow:**
1. Read custom instructions about MCP tools
2. See that database queries should use `get_database_schema` first
3. Automatically invoke tools in the right order
4. Format results according to our guidelines

---

### Phase 7: Testing & Validation

#### 7.1 Manual Testing Checklist
- [ ] Start VS Code with Oracle database running
- [ ] MCP server appears in Extensions view (MCP SERVERS section)
- [ ] Server starts without errors
- [ ] Tools appear in tools picker (Configure Tools button)
- [ ] Ask "What tables exist?" → `get_database_schema` is invoked
- [ ] Ask "Query the database version" → `query_database` is invoked
- [ ] Verify tool approval dialogs work
- [ ] Check logs: "MCP: List Servers" → "Show Output"

#### 7.2 Validation Questions to Ask Copilot
1. "What tables are in our Oracle database?"
2. "Show me the structure of the EMPLOYEES table"
3. "What version of Oracle are we running?"
4. "How many tablespaces are defined?"
5. "Write a query to find all active users"

#### 7.3 Expected Tool Invocations
| Question | Tool Used | Parameters |
|----------|-----------|------------|
| What tables exist? | get_database_schema | (no params) |
| Structure of EMPLOYEES? | get_database_schema | tableName: "EMPLOYEES" |
| Oracle version? | query_database | query: "SELECT * FROM v$version" |
| Count tablespaces? | query_database | query: "SELECT COUNT(*) FROM dba_tablespaces" |

---

### Phase 8: Troubleshooting Guide

#### Common Issues

**Issue 1: MCP server not appearing**
- Check `.vscode/mcp.json` exists and is valid JSON
- Run "MCP: List Servers" to verify registration
- Check MCP access setting: `chat.mcp.access` should be `all`

**Issue 2: Tools not available in agent mode**
- Click "Configure Tools" button in Chat view
- Verify both tools are checked
- Reset cached tools: "MCP: Reset Cached Tools"
- Restart MCP server

**Issue 3: Server fails to start**
- Check server output: "MCP: List Servers" → "Show Output"
- Verify Oracle database is running: `docker ps | grep oracle`
- Check `.env` file exists with correct values
- Verify build is current: `npm run build`

**Issue 4: Connection errors**
- Verify `ORACLE_CONNECTION_STRING` is correct
- Test connection: `npm run test-client`
- Check Oracle is healthy: `docker ps` shows `(healthy)`

**Issue 5: Tools appear but don't work**
- Check tool approval settings
- Review error in MCP output log
- Verify query syntax is valid Oracle SQL
- Check database user has SELECT privileges

---

### Phase 9: Documentation Updates

#### 9.1 Update VS Code Integration Guide
Add section on MCP configuration:
- `mcp.json` configuration examples
- Input variables setup
- Tool usage examples
- Troubleshooting steps

#### 9.2 Create Quick Start Guide
**File:** `docs/QUICK-START-VSCODE.md`

Content:
1. Prerequisites checklist
2. 3-step setup process
3. First query example
4. Common commands reference

#### 9.3 Update README
Add badge/section:
```markdown
## 🚀 Quick Start with VS Code

1. Copy `.vscode/mcp.json.example` to `.vscode/mcp.json`
2. Open VS Code and reload window
3. Start Oracle database: `docker start oracle-xe`
4. Ask Copilot: "What tables are in the database?"

See [VS Code Integration Guide](./docs/VSCODE-INTEGRATION.md) for details.
```

---

## File Checklist

### Files to Create
- [ ] `.vscode/mcp.json.example` - Template configuration
- [ ] `.vscode/tool-sets.jsonc` - Database tool set definition
- [ ] `docs/QUICK-START-VSCODE.md` - Quick start guide
- [ ] `docs/VSCODE-AGENT-MODE-PLAN.md` - This file

### Files to Update
- [ ] `.gitignore` - Add `.vscode/mcp.json` (contains credentials)
- [ ] `docs/VSCODE-INTEGRATION.md` - Add MCP configuration section
- [ ] `README.md` - Add quick start section
- [ ] `.github/copilot-instructions.md` - Reference MCP tools

### Files to Keep
- [x] `src/server.ts` - No changes needed
- [x] `src/tools/queryDatabase.ts` - No changes needed
- [x] `src/tools/getSchema.ts` - No changes needed
- [x] `.env.example` - Already documented

---

## Success Criteria

### Minimum Viable Product (MVP)
- [ ] MCP server configured in `.vscode/mcp.json`
- [ ] Server starts successfully in VS Code
- [ ] Both tools visible in tools picker
- [ ] Can ask Copilot database questions
- [ ] Tools are automatically invoked
- [ ] Results are returned correctly

### Enhanced Experience
- [ ] Input variables work for credentials
- [ ] Tool set defined for easy reference
- [ ] Documentation complete
- [ ] Troubleshooting guide tested
- [ ] Custom instructions guide tool usage
- [ ] Example queries documented

### Production Ready
- [ ] All error scenarios handled
- [ ] Logging configured properly
- [ ] Security best practices followed
- [ ] Team onboarding docs complete
- [ ] CI/CD includes build step
- [ ] Multi-workspace support tested

---

## Next Steps

### Immediate Actions (Do Now)
1. Create `.vscode/mcp.json.example` template
2. Update `.gitignore` to exclude `.vscode/mcp.json`
3. Test configuration with local Oracle database
4. Document in VS Code Integration Guide

### Short-term Actions (This Week)
1. Create tool set definition
2. Write quick start guide
3. Test all usage patterns
4. Update README with quick start

### Long-term Improvements (Future)
1. Add more Oracle-specific tools (explain plan, statistics)
2. Create tool for generating SQL from natural language
3. Add prompt templates for common queries
4. Integrate with schema documentation
5. Add support for multiple database connections

---

## Security Notes

### Credential Storage
- VS Code stores input variable values securely
- Never commit `.vscode/mcp.json` with credentials
- Use `.env` file (already gitignored) for local dev
- Consider using environment variables for CI/CD

### Tool Approvals
- Always review query before approval
- Use "Allow for workspace" for trusted workspaces
- Never use "Always allow" in shared environments
- Regular users should use "Allow once" for safety

### Network Security
- MCP server communicates via stdio (local only)
- No HTTP endpoints exposed
- Oracle connection can be localhost or remote
- Use read-only database user when possible

---

## Appendix: Example Chat Sessions

### Session 1: Schema Discovery
```
User: What tables exist in our database?

Copilot: Let me check the database schema.
[Invokes: get_database_schema()]

Copilot: Your Oracle database has 134 tables, including:
- EMPLOYEES
- DEPARTMENTS
- PRODUCTS
- ORDERS
...

Would you like details about any specific table?
```

### Session 2: Query Execution
```
User: Show me the Oracle database version

Copilot: I'll query the database version information.
[Invokes: query_database({ 
  query: "SELECT * FROM v$version WHERE ROWNUM = 1" 
})]

Copilot: You're running Oracle Database 21c Express Edition 
Release 21.0.0.0.0 - Production
```

### Session 3: Multi-Step Workflow
```
User: Find all employees hired in the last year

Copilot: Let me first check the EMPLOYEES table structure.
[Invokes: get_database_schema({ tableName: "EMPLOYEES" })]

Copilot: The EMPLOYEES table has:
- EMPLOYEE_ID
- FIRST_NAME, LAST_NAME
- HIRE_DATE
- ...

Now I'll query for recent hires.
[Invokes: query_database({
  query: "SELECT * FROM employees WHERE hire_date >= ADD_MONTHS(SYSDATE, -12)"
})]

Copilot: Found 47 employees hired in the last year:
[Results...]
```

---

## Resources

- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [VS Code Agent Mode](https://code.visualstudio.com/docs/copilot/chat/copilot-chat#_built-in-chat-modes)
- [Tool Configuration](https://code.visualstudio.com/docs/copilot/chat/chat-tools)
