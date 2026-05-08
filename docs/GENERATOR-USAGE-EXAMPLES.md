# MCP Generator Usage Examples

This document demonstrates how to use the MCP generator prompt files to create new MCP tools and projects.

## ⚠️ Important Note About Documentation

**These examples demonstrate prompt usage, but always instruct the AI to fetch official MCP documentation first:**
- MCP Specification: https://spec.modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Documentation: https://modelcontextprotocol.io/

The official docs may have updates that supersede patterns shown in these examples.

---

## Example 1: Testing the PostgreSQL Prompt

To verify the PostgreSQL example from `MCP-GENERATOR-EXAMPLES.md` works correctly, follow these steps:

### Step 1: Copy the Prompt

Open `MCP-GENERATOR-EXAMPLES.md` and copy the complete PostgreSQL MCP Server prompt (Example 1).

### Step 2: Prepare Your AI Assistant

Open your AI assistant (GitHub Copilot Chat, ChatGPT, Claude, etc.) and paste the prompt.

### Step 3: Expected Output

The AI should generate:

1. **Project initialization commands:**
```bash
cd ~/projects
mkdir mcp-postgresql
cd mcp-postgresql
npm init -y
# ... etc
```

2. **package.json** with dependencies:
- @modelcontextprotocol/sdk@^1.20.2
- pg@^8.11.0
- @types/pg@^8.10.0
- zod@^3.25.76
- dotenv@^16.3.1
- typescript@^5.3.3

3. **tsconfig.json** with ES2022 configuration

4. **src/server.ts** - Main MCP server with:
- Server initialization
- Tool registration
- Request handlers
- Graceful shutdown

5. **src/config.ts** - Environment validation with Zod

6. **src/database/postgresConnection.ts** - Connection pool management

7. **src/database/queryExecutor.ts** - Query execution with limits

8. **src/tools/queryDatabase.ts** - Query tool implementation

9. **src/tools/getSchema.ts** - Schema tool implementation

10. **src/tools/explainQuery.ts** - Explain tool implementation

11. **.env.example** - Environment variable template

12. **.gitignore** - Proper exclusions

13. **README.md** - Setup and usage instructions

### Step 4: Validation Criteria

✅ All files use `.js` extensions in imports (ES modules)
✅ All tools use Zod schemas for validation
✅ Error handling with try/catch in all async functions
✅ Connection pooling configured
✅ Environment variables validated
✅ MCP-compliant response format (content array)
✅ Logging included
✅ Graceful shutdown handlers

## Example 2: Adding a Tool to an Existing Project

To test adding a new tool to an existing MCP server:

### Step 1: Use the Quick Start Path A

From `QUICK-START-GENERATOR.md`, copy the "Path A: Add Tool to Existing MCP Server" prompt and customize it:

```
Add a new MCP tool to this project following MCP best practices.

Tool: get_table_stats
Purpose: Get statistics about a table (row count, size, last modified)
Inputs: 
  - tableName: string (required)
  - includeIndexes: boolean (optional, default false)
Data source: Database (existing connection)

Generate:
1. src/tools/getTableStats.ts with Zod schema and implementation
2. Tool registration code for src/server.ts
3. Type definitions if needed

Follow these patterns:
- ES2022 modules with .js extensions in imports
- Zod schemas for validation
- MCP-compliant response format
- Comprehensive error handling
```

### Step 2: Expected Output

The AI should generate:

1. **src/tools/getTableStats.ts**:
```typescript
import { z } from 'zod';
import { executeQuery } from '../database/queryExecutor.js';
import logger from '../utils/logger.js';

export const GetTableStatsSchema = z.object({
  tableName: z.string().min(1, 'Table name cannot be empty'),
  includeIndexes: z.boolean().default(false),
});

export type GetTableStatsInput = z.infer<typeof GetTableStatsSchema>;

export async function getTableStats(input: GetTableStatsInput) {
  try {
    const validated = GetTableStatsSchema.parse(input);
    logger.info('Getting table stats', { tableName: validated.tableName });
    
    // Query implementation...
    
    return { success: true, data: result };
  } catch (err: any) {
    logger.error('Get table stats failed', { error: err.message });
    return { success: false, error: err.message };
  }
}
```

2. **Registration code for src/server.ts**:
- Add to tools array
- Add import statement
- Add handler in CallToolRequestSchema

### Step 3: Integration Steps

1. Save the generated file to `src/tools/getTableStats.ts`
2. Add the import to `src/server.ts`
3. Add the tool definition to the tools array
4. Add the handler in the CallToolRequestSchema switch
5. Build: `npm run build`
6. Test: `npm run test-client`

## Example 3: Quick Start for GitHub MCP Server

Using `QUICK-START-GENERATOR.md` Path B:

### Step 1: Prepare Directory

```bash
cd ~/projects
mkdir mcp-github
cd mcp-github
```

### Step 2: Use the Template

Copy the Path B prompt from Quick Start, customize for GitHub:

```
Create a standalone MCP server project for macOS/VS Code.

PROJECT: mcp-github-server
PURPOSE: Query GitHub repositories and issues
DATA SOURCE: GitHub REST API via Octokit
TOOLS: 
  - search_repositories
  - list_issues
  - get_pull_request

REQUIREMENTS:
- Working directory: /Users/yourname/projects/mcp-github
- TypeScript with ES2022 modules (.js imports)
- Use @modelcontextprotocol/sdk v1.20.2+
- Zod for validation
- MCP-compliant response format
...
```

### Step 3: Follow Generated Commands

The AI will provide initialization commands like:

```bash
npm init -y
npm install @modelcontextprotocol/sdk@^1.20.2 @octokit/rest@^20.0.0 zod@^3.25.76 dotenv@^16.3.1
npm install -D typescript@^5.3.3 @types/node@^20.19.23
mkdir -p src/{github,tools,utils}
# ... create files ...
npm run build
```

## Verification Checklist

When testing any generated prompt, verify:

- [ ] All TypeScript files compile without errors
- [ ] All imports use `.js` extensions
- [ ] Zod schemas validate inputs correctly
- [ ] Error handling is comprehensive
- [ ] Environment variables are validated
- [ ] Connection/client management follows pooling pattern
- [ ] Tools return MCP-compliant format
- [ ] Graceful shutdown works
- [ ] Test client can connect and call tools
- [ ] VS Code integration works (if testing that far)

## Common Adjustments Needed

Sometimes the AI may need guidance on:

1. **Import extensions**: Remind to use `.js` for all imports
2. **Connection pooling**: Ensure singleton pattern for clients
3. **Error messages**: Sanitize before returning to user
4. **Type safety**: Use explicit types, avoid `any`
5. **Environment validation**: Always use Zod schemas

## Testing the Prompts Without Executing

You can validate prompts by:

1. **Check completeness**: Does it specify all required information?
2. **Check clarity**: Are the requirements unambiguous?
3. **Check examples**: Are there concrete examples of inputs/outputs?
4. **Check macOS specifics**: Does it mention directory creation and absolute paths?
5. **Check dependencies**: Are version numbers specified?

## Success Metrics

A successful prompt generation includes:

✅ Complete project structure
✅ All configuration files (package.json, tsconfig.json, .env.example)
✅ Core server implementation
✅ At least 2 working tools
✅ Type definitions
✅ Error handling
✅ Documentation (README)
✅ macOS-specific initialization commands
✅ VS Code integration instructions

## Next Steps

After validating the prompts work:

1. Share with your team
2. Customize for your specific needs
3. Add more example prompts for other services
4. Create templates for your organization
5. Contribute improvements back to the repository

---

**Note**: These prompts are templates. Always review and test the generated code before deploying to production!
