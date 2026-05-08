# Quick Start: Generate Your MCP Project

This is a condensed, copy-paste-ready guide for quickly generating new MCP projects on macOS with VS Code.

## 📚 Important: Official Documentation

**Before using these prompts, review the latest official docs:**
- MCP Specification: https://spec.modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- VS Code MCP Docs: https://code.visualstudio.com/docs/copilot/copilot-extensibility-overview

These prompts provide quick templates but always defer to official documentation for current specifications.

---

## 🚀 5-Minute Setup

### Prerequisites Check
```bash
node --version  # Should be v18+
npm --version   # Should be installed
code --version  # VS Code should be installed
```

---

## 📋 Choose Your Path

### Path A: Add Tool to Existing MCP Server

1. **Navigate to your project:**
```bash
cd /Users/yourname/projects/my-existing-mcp
```

2. **Copy this prompt to Copilot/ChatGPT/Claude:**

```
Add a new MCP tool to this project following MCP best practices.

BEFORE STARTING: Fetch latest docs from:
- https://spec.modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/typescript-sdk

Tool: [name, e.g., "search_logs"]
Purpose: [what it does, e.g., "Search application logs by keyword and date range"]
Inputs: [list parameters with types]
Data source: [e.g., file system, API, database]

Generate:
1. src/tools/[toolname].ts with Zod schema and implementation
2. Tool registration code for src/server.ts
3. Type definitions if needed

Follow these patterns:
- ES2022 modules with .js extensions in imports
- Zod schemas for validation
- MCP-compliant response format ({ content: [...] })
- Comprehensive error handling
```

3. **Build and test:**
```bash
npm run build
npm run test-client
```

---

### Path B: Create New Standalone MCP Server

1. **Setup project directory:**
```bash
cd ~/projects
mkdir my-new-mcp
cd my-new-mcp
```

2. **Copy this complete prompt to your AI assistant:**

```
Create a standalone MCP server project for macOS/VS Code using TypeScript and ES2022 modules.

BEFORE STARTING: Fetch and review latest documentation:
- MCP Specification: https://spec.modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Anthropic MCP Guide: https://docs.anthropic.com/en/docs/build-with-claude/model-context-protocol
- VS Code MCP Docs: https://code.visualstudio.com/docs/copilot/copilot-extensibility-overview

PROJECT: [name, e.g., "mcp-github-server"]
PURPOSE: [what it does]
DATA SOURCE: [e.g., GitHub API, PostgreSQL, Files]
TOOLS: [list 2-3 tools to create]

REQUIREMENTS:
- Working directory: $(pwd)
- TypeScript with ES2022 modules (.js imports required)
- Use @modelcontextprotocol/sdk v1.20.2+
- Zod for validation
- Environment config via .env
- Includes test client

ARCHITECTURE PATTERNS:
1. **Project Structure:**
   - src/server.ts (main MCP server with stdio transport)
   - src/client.ts (test client)
   - src/config.ts (Zod-validated environment config)
   - src/tools/*.ts (MCP tool implementations)
   - src/utils/logger.ts (logging utility)
   - src/[datasource]/ (connection and operation logic)

2. **Key Patterns:**
   - ES2022 modules: All imports use .js extensions
   - Zod schemas: Validate all inputs and config
   - MCP-compliant: Tools return { content: [...] } format
   - Stdio transport: Communication via stdin/stdout
   - Error handling: Try/catch in all async functions
   - Graceful shutdown: SIGINT/SIGTERM handlers

3. **Dependencies:**
   - @modelcontextprotocol/sdk (^1.20.2)
   - zod (^3.25.76)
   - dotenv (^16.3.1)
   - typescript (^5.3.3)
   - @types/node (^20.19.23)
   - [add data source specific libraries]

Generate complete project:
1. package.json with correct scripts
2. tsconfig.json for ES2022 modules  
3. src/server.ts (main MCP server)
4. src/config.ts (Zod-validated config)
5. src/client.ts (test client)
6. src/tools/*.ts (2+ example tools)
7. src/utils/logger.ts
8. .env.example
9. .gitignore
10. README.md with setup instructions

After generation, provide initialization commands.
```

3. **Run the initialization commands provided by AI**

4. **Configure and test:**
```bash
# Edit .env with your credentials
code .env

# Build
npm run build

# Test
npm run test-client
```

---

## 🔧 VS Code Integration (Both Paths)

1. **Create VS Code MCP config:**
```bash
mkdir -p .vscode
cat > .vscode/mcp.json << 'EOF'
{
  "servers": {
    "myserver": {
      "type": "stdio",
      "command": "node",
      "args": ["REPLACE_WITH_ABSOLUTE_PATH/dist/server.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
EOF
```

2. **Update the path:**
```bash
# Get current directory
pwd
# Edit .vscode/mcp.json and replace REPLACE_WITH_ABSOLUTE_PATH
```

3. **Reload VS Code:**
- Press `Cmd+Shift+P`
- Type "Reload Window"
- Press Enter

4. **Test with Copilot:**
```
Ask: "What tools are available in myserver?"
```

---

## 📦 Common Tool Templates

### Database Query Tool
```
Create a query_database tool that:
- Accepts SQL query string
- Optional maxRows and timeout parameters
- Returns { success, data, error }
- Uses Zod schema for validation
- Logs all queries
```

### API Fetch Tool
```
Create a fetch_resource tool that:
- Accepts resource ID and optional filters
- Calls external REST API
- Returns formatted data
- Handles rate limiting
- Includes retry logic
```

### File Search Tool
```
Create a search_files tool that:
- Accepts directory path and search pattern
- Supports recursive search
- Returns file list with metadata
- Validates paths for security
- Handles permission errors
```

---

## 🐛 Quick Troubleshooting

**Build fails with "Cannot find module":**
```bash
npm install
npm run build
```

**Test client can't connect:**
```bash
# Check server built successfully
ls -la dist/server.js

# Check .env file exists and has values
cat .env
```

**VS Code doesn't see MCP server:**
```bash
# Verify .vscode/mcp.json has absolute path
cat .vscode/mcp.json

# Rebuild and reload
npm run build
# Then reload VS Code window
```

**Tool not showing in Copilot:**
```bash
# Verify tool registered in server.ts
grep -n "tool_name" src/server.ts

# Rebuild
npm run build

# Reload VS Code
```

---

## 📝 Environment Variables Template

```env
# Copy to .env and fill in your values

# Service Connection
SERVICE_URL=https://api.example.com
SERVICE_API_KEY=your_key_here
SERVICE_TIMEOUT_MS=30000

# Connection Pool (if applicable)
POOL_MIN=2
POOL_MAX=10

# Operation Limits
MAX_ROWS_PER_QUERY=1000
QUERY_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true

# Server
SERVER_NAME=my-mcp-server
SERVER_VERSION=1.0.0
```

---

## ✅ Checklist

Before using your MCP server:

- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env` file created and filled)
- [ ] Project builds successfully (`npm run build`)
- [ ] Test client works (`npm run test-client`)
- [ ] VS Code config created (`.vscode/mcp.json`)
- [ ] Absolute path set in mcp.json
- [ ] VS Code reloaded
- [ ] Tools visible to Copilot

---

## 🎯 Next Steps

1. Add more tools as needed
2. Update README with usage examples
3. Add error handling and validation
4. Set up CI/CD if deploying
5. Share with your team

For detailed patterns and examples, see: **MCP-PROJECT-GENERATOR-PROMPT.md**
