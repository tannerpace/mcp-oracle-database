# MCP Project Generator Prompt

This prompt file helps you create new MCP (Model Context Protocol) tools or standalone MCP projects based on the proven architecture of this Oracle MCP Server.

## 🎯 Purpose

Use this prompt with AI assistants (like GitHub Copilot, Claude, or ChatGPT) to generate:
- **New MCP tools** within an existing MCP server
- **Standalone MCP projects** with complete infrastructure
- **Custom integrations** for different data sources or APIs

## 📋 Prerequisites

Before using this prompt, ensure you have:
- **Node.js** v18 or higher installed
- **VS Code** with GitHub Copilot (or your preferred AI assistant)
- **npm** or **pnpm** package manager
- **macOS, Linux, or Windows** with a terminal

## 🚀 How to Use This Prompt

### Option 1: Generate a New MCP Tool (Add to Existing Project)

**Copy and paste this to your AI assistant:**

```
I want to create a new MCP tool based on the Oracle MCP Server architecture.

PROJECT CONTEXT:
- I'm working in: [specify directory path, e.g., /Users/yourname/projects/my-mcp]
- The project already exists and follows the MCP server pattern
- I want to add a new tool to src/tools/

NEW TOOL REQUIREMENTS:
- Tool name: [e.g., "search_files", "fetch_api_data", "analyze_logs"]
- Description: [brief description of what this tool does]
- Input parameters: [list expected inputs with types]
- Output format: [describe the expected output]
- Data source: [e.g., file system, REST API, database, etc.]

ARCHITECTURE TO FOLLOW:
1. Create a new file in src/tools/[toolname].ts
2. Define Zod schema for input validation
3. Implement the tool function with proper error handling
4. Return MCP-compliant response format
5. Add logging for audit trail
6. Register the tool in src/server.ts

Please generate:
1. The tool implementation file (src/tools/[toolname].ts)
2. The registration code for src/server.ts
3. Usage examples
4. Any additional types or utilities needed
```

### Option 2: Generate a Complete Standalone MCP Project

**Copy and paste this to your AI assistant:**

```
I want to create a standalone MCP server project based on the Oracle MCP Server architecture.

PROJECT SETUP (macOS/VS Code):
- Create new project in: [specify path, e.g., ~/projects/my-new-mcp]
- If the directory doesn't exist, please instruct me to create it first

PROJECT REQUIREMENTS:
- Project name: [e.g., "mcp-github-server", "mcp-slack-integration"]
- Description: [what this MCP server will do]
- Data source/service: [e.g., GitHub API, Slack API, PostgreSQL, MongoDB, file system]
- Planned tools: [list 2-3 tools this server will provide]

ARCHITECTURE TO IMPLEMENT:
Based on the Oracle MCP Server pattern, create a complete project with:

1. **Project Structure:**
   ```
   my-mcp/
   ├── src/
   │   ├── server.ts              # Main MCP server entry point
   │   ├── client.ts              # Test client for local validation
   │   ├── config.ts              # Configuration with Zod validation
   │   ├── [datasource]/          # Data source connection logic
   │   │   ├── connection.ts      # Connection/client manager
   │   │   ├── executor.ts        # Operation executor
   │   │   └── types.ts           # Type definitions
   │   ├── tools/                 # MCP tools
   │   │   ├── tool1.ts
   │   │   └── tool2.ts
   │   └── utils/
   │       └── logger.ts          # Logging utility
   ├── dist/                      # Compiled JavaScript (generated)
   ├── .env                       # Environment variables (git ignored)
   ├── .env.example               # Environment template
   ├── .gitignore
   ├── package.json
   ├── tsconfig.json
   └── README.md
   ```

2. **Dependencies to include:**
   - @modelcontextprotocol/sdk (^1.20.2)
   - zod (^3.25.76)
   - dotenv (^16.3.1)
   - [any specific client libraries for your data source]
   - typescript (^5.3.3)
   - @types/node (^20.19.23)

3. **Configuration pattern:**
   - Use Zod schemas for environment variable validation
   - Support both .env file and environment variables
   - Include sensible defaults
   - Cache configuration after first load

4. **MCP Server pattern:**
   - Use stdio transport for VS Code/Copilot integration
   - Register tools via ListToolsRequestSchema and CallToolRequestSchema
   - Return responses with content array format
   - Implement graceful shutdown (SIGINT/SIGTERM handlers)
   - Add comprehensive error handling

5. **Tool implementation pattern:**
   - Each tool in separate file under src/tools/
   - Zod schema for input validation
   - Async functions with try/catch
   - Return { success: boolean, data?: any, error?: string }
   - Log all tool invocations

6. **TypeScript configuration:**
   - Target: ES2022
   - Module: ES2022
   - Strict mode enabled
   - All imports must include .js extension
   - Generate source maps and declarations

7. **Package.json scripts:**
   - build: tsc
   - dev: tsc --watch
   - start: node dist/server.js
   - test-client: node dist/client.js
   - clean: rm -rf dist
   - typecheck: tsc --noEmit

8. **VS Code integration (.vscode/mcp.json):**
   ```json
   {
     "servers": {
       "[serverName]": {
         "type": "stdio",
         "command": "node",
         "args": ["[absolute-path]/dist/server.js"],
         "env": {
           "ENV_VAR_1": "value1",
           "ENV_VAR_2": "value2"
         }
       }
     }
   }
   ```

Please generate:
1. Complete project structure
2. All necessary configuration files
3. Implementation of core files (server.ts, config.ts, etc.)
4. At least 2 example tools
5. README.md with setup instructions
6. .env.example file
7. Step-by-step initialization commands for macOS terminal
```

## 🛠️ Initialization Commands for macOS/Linux

After generating your project files, run these commands in your terminal:

```bash
# Navigate to your desired parent directory
cd ~/projects

# Create project directory
mkdir my-new-mcp
cd my-new-mcp

# Initialize npm project (or let AI generate package.json)
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk@^1.20.2 zod@^3.25.76 dotenv@^16.3.1

# Install dev dependencies
npm install -D typescript@^5.3.3 @types/node@^20.19.23

# Create directory structure
mkdir -p src/{tools,utils}
mkdir -p .vscode

# Copy environment template and configure
cp .env.example .env
# Edit .env with your actual credentials

# Build the project
npm run build

# Test the server
npm run test-client
```

## 📦 Common MCP Tool Patterns

### Pattern 1: Database Query Tool

```typescript
// src/tools/queryData.ts
import { z } from 'zod';
import { executeQuery } from '../database/executor.js';
import logger from '../utils/logger.js';

export const QueryDataSchema = z.object({
  query: z.string().min(1),
  maxRows: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

export type QueryDataInput = z.infer<typeof QueryDataSchema>;

export async function queryData(input: QueryDataInput) {
  try {
    const validated = QueryDataSchema.parse(input);
    logger.info('Executing query', { queryLength: validated.query.length });
    
    const result = await executeQuery(validated.query, {
      maxRows: validated.maxRows,
      timeout: validated.timeout,
    });

    return { success: true, data: result };
  } catch (err: any) {
    logger.error('Query failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
```

### Pattern 2: API Fetch Tool

```typescript
// src/tools/fetchResource.ts
import { z } from 'zod';
import { apiClient } from '../api/client.js';
import logger from '../utils/logger.js';

export const FetchResourceSchema = z.object({
  resourceId: z.string(),
  includeDetails: z.boolean().default(false),
});

export type FetchResourceInput = z.infer<typeof FetchResourceSchema>;

export async function fetchResource(input: FetchResourceInput) {
  try {
    const validated = FetchResourceSchema.parse(input);
    logger.info('Fetching resource', { resourceId: validated.resourceId });
    
    const result = await apiClient.get(validated.resourceId, {
      detailed: validated.includeDetails,
    });

    return { success: true, data: result };
  } catch (err: any) {
    logger.error('Fetch failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
```

### Pattern 3: File System Tool

```typescript
// src/tools/listFiles.ts
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

export const ListFilesSchema = z.object({
  directory: z.string(),
  pattern: z.string().optional(),
  recursive: z.boolean().default(false),
});

export type ListFilesInput = z.infer<typeof ListFilesSchema>;

export async function listFiles(input: ListFilesInput) {
  try {
    const validated = ListFilesSchema.parse(input);
    logger.info('Listing files', { directory: validated.directory });
    
    const files = await fs.readdir(validated.directory, {
      recursive: validated.recursive,
      withFileTypes: true,
    });

    const filtered = validated.pattern
      ? files.filter(f => f.name.match(validated.pattern!))
      : files;

    return {
      success: true,
      data: {
        directory: validated.directory,
        files: filtered.map(f => ({
          name: f.name,
          type: f.isDirectory() ? 'directory' : 'file',
        })),
      },
    };
  } catch (err: any) {
    logger.error('List files failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
```

### Pattern 4: Schema/Introspection Tool

```typescript
// src/tools/getSchema.ts
import { z } from 'zod';
import { getConnection } from '../database/connection.js';
import logger from '../utils/logger.js';

export const GetSchemaSchema = z.object({
  tableName: z.string().optional(),
});

export type GetSchemaInput = z.infer<typeof GetSchemaSchema>;

export async function getSchema(input: GetSchemaInput = {}) {
  try {
    const validated = GetSchemaSchema.parse(input);
    logger.info('Getting schema', { tableName: validated.tableName });
    
    const conn = await getConnection();
    
    if (validated.tableName) {
      // Get columns for specific table
      const columns = await conn.getTableColumns(validated.tableName);
      return { success: true, data: { table: validated.tableName, columns } };
    } else {
      // List all tables
      const tables = await conn.listTables();
      return { success: true, data: { tables } };
    }
  } catch (err: any) {
    logger.error('Get schema failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
```

## 🔧 Tool Registration in server.ts

```typescript
// Add to tools array
const tools: Tool[] = [
  {
    name: 'your_tool_name',
    description: 'Clear description of what this tool does',
    inputSchema: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Description of param1',
        },
        param2: {
          type: 'number',
          description: 'Description of param2 (optional)',
        },
      },
      required: ['param1'],
    },
  },
];

// Add to CallToolRequestSchema handler
if (name === 'your_tool_name') {
  const validated = YourToolSchema.parse(args);
  const result = await yourToolFunction(validated);
  
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

## 📝 Environment Configuration Template

```env
# [SERVICE_NAME] Configuration

# Connection Settings
SERVICE_URL=https://api.example.com
SERVICE_API_KEY=your_api_key_here
SERVICE_TIMEOUT_MS=30000

# Connection Pool/Client Settings (if applicable)
POOL_MIN=2
POOL_MAX=10

# Rate Limiting (if applicable)
MAX_REQUESTS_PER_MINUTE=60

# Query/Operation Settings
MAX_RESULTS_PER_QUERY=1000
DEFAULT_TIMEOUT_MS=30000

# Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true

# Server
SERVER_NAME=your-mcp-server
SERVER_VERSION=1.0.0
```

## 🔒 Security Best Practices

When creating MCP tools, always:

1. **Use read-only access** when possible
2. **Validate all inputs** with Zod schemas
3. **Never commit secrets** - use .env files (add to .gitignore)
4. **Set timeouts** to prevent hanging operations
5. **Limit result sizes** to prevent memory issues
6. **Log all operations** for audit trail
7. **Handle errors gracefully** - never expose internal details to users
8. **Use connection pooling** for database/API clients
9. **Clean up resources** in shutdown handlers
10. **Test with invalid inputs** before deployment

## 🧪 Testing Your MCP Server

Create a test client (src/client.ts):

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('Starting test client...');
  
  // Spawn the MCP server process
  const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: process.env,
  });

  // Create MCP client
  const transport = new StdioClientTransport({
    command: serverProcess,
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  // List available tools
  const toolsResponse = await client.listTools();
  console.log('Available tools:', toolsResponse.tools);

  // Test your tool
  const result = await client.callTool({
    name: 'your_tool_name',
    arguments: {
      param1: 'test_value',
    },
  });
  console.log('Tool result:', result);

  // Cleanup
  await client.close();
  serverProcess.kill();
}

testMCPServer().catch(console.error);
```

## 📚 VS Code Integration

### Step 1: Build your MCP server

```bash
npm run build
```

### Step 2: Create .vscode/mcp.json

```json
{
  "servers": {
    "myserver": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/yourname/projects/my-mcp/dist/server.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 3: Reload VS Code

- Press Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)
- Type "Developer: Reload Window"
- Or restart VS Code

### Step 4: Test with Copilot

Ask Copilot:
- "What tools are available in myserver?"
- "Use [tool_name] to [do something]"

## 🎨 Customization Tips

### For Different Data Sources

**PostgreSQL/MySQL:**
```typescript
import { Pool } from 'pg'; // or mysql2
// Similar pattern to Oracle connection pool
```

**MongoDB:**
```typescript
import { MongoClient } from 'mongodb';
// Use MongoClient.connect() pattern
```

**REST APIs:**
```typescript
import axios from 'axios';
// Create axios instance with baseURL and defaults
```

**GraphQL:**
```typescript
import { GraphQLClient } from 'graphql-request';
// Configure GraphQL endpoint
```

**File System:**
```typescript
import { promises as fs } from 'fs';
// Use fs promises API for async operations
```

### For Different Tool Types

**Search/Query Tools:**
- Accept search parameters
- Return paginated results
- Support filters and sorting

**CRUD Tools:**
- Separate tools for create, read, update, delete
- Validate required fields
- Return operation status

**Analytics Tools:**
- Aggregate data
- Calculate metrics
- Return summaries and insights

**Integration Tools:**
- Fetch external data
- Transform formats
- Sync between systems

## 🚨 Common Pitfalls to Avoid

1. **Forgetting .js extensions** in ES module imports
2. **Not using Zod validation** for inputs
3. **Missing error handling** in async functions
4. **Exposing sensitive data** in logs or responses
5. **Not setting timeouts** for long operations
6. **Hardcoding paths** instead of using environment variables
7. **Not cleaning up** connections/resources on shutdown
8. **Returning raw errors** to users instead of sanitized messages
9. **Not testing** with the test client before VS Code integration
10. **Forgetting to build** (npm run build) after code changes

## 📖 Additional Resources

- **MCP SDK Documentation**: https://github.com/modelcontextprotocol/sdk
- **Oracle MCP Server**: This repository - reference implementation
- **Zod Documentation**: https://zod.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

## 💡 Example Use Cases

### 1. GitHub MCP Server
```
Tools:
- search_repositories
- get_pull_requests
- create_issue
- list_commits
```

### 2. Slack MCP Server
```
Tools:
- send_message
- list_channels
- search_messages
- get_user_info
```

### 3. File System MCP Server
```
Tools:
- list_files
- read_file
- search_content
- get_file_stats
```

### 4. PostgreSQL MCP Server
```
Tools:
- query_database
- get_schema
- list_tables
- analyze_table
```

### 5. Jira MCP Server
```
Tools:
- search_issues
- create_ticket
- update_status
- get_sprint_info
```

## 🎯 Next Steps After Generation

1. **Review generated code** - Ensure it matches your requirements
2. **Install dependencies** - Run `npm install`
3. **Configure environment** - Copy .env.example to .env and fill in values
4. **Build the project** - Run `npm run build`
5. **Test locally** - Run `npm run test-client`
6. **Integrate with VS Code** - Create .vscode/mcp.json
7. **Test with Copilot** - Ask questions and verify responses
8. **Add more tools** - Extend functionality as needed
9. **Document usage** - Update README with examples
10. **Share with team** - Publish to npm or share repository

---

## 📞 Support

If you encounter issues:
1. Check the Oracle MCP Server repository for reference implementations
2. Review MCP SDK documentation
3. Verify your environment variables are set correctly
4. Test with the built-in client before VS Code integration
5. Check logs for detailed error messages

**Happy MCP Building! 🚀**
