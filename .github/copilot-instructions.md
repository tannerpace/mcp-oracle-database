# Copilot Instructions for Oracle Database MCP Server

## Project Overview

This is a Model Context Protocol (MCP) server that enables GitHub Copilot and other LLMs to execute **read-only** SQL queries against an Oracle database. The server communicates via stdio (standard input/output) transport and uses the MCP protocol for tool invocation.

## Architecture

```
GitHub Copilot
      ↓ (MCP Protocol)
  MCP Client (spawns process)
      ↓ (JSON-RPC over stdio)
  MCP Server (Node.js)
      ↓ (oracledb - Thin Mode)
  Oracle DB (read-only user)
```

## Key Technologies

- **TypeScript** with ES2022 modules
- **MCP SDK** (`@modelcontextprotocol/sdk`) for protocol implementation
- **oracledb** (Thin Mode) - pure JavaScript Oracle driver, no Oracle Instant Client needed
- **Zod** for input validation and schema definition
- **Winston** for structured logging
- **dotenv** for environment configuration

## Project Structure

- `src/server.ts` - Main MCP server entry point, handles stdio transport
- `src/client.ts` - Test client for local testing
- `src/config.ts` - Configuration with Zod validation
- `src/database/` - Oracle connection management and query execution
  - `oracleConnection.ts` - Connection pool manager
  - `queryExecutor.ts` - Query execution logic
  - `types.ts` - Database-related TypeScript types
- `src/tools/` - MCP tool implementations
  - `queryDatabase.ts` - Executes SQL SELECT queries
  - `getSchema.ts` - Retrieves database schema information
- `src/logging/` - Winston-based logging system

## Coding Standards

### TypeScript Configuration

- **Target**: ES2022
- **Module System**: ES2022 (use `import`/`export`, not `require`)
- **Strict Mode**: Enabled - all strict type checking is enforced
- **Output**: Compiled to `dist/` directory
- **Source Maps**: Enabled for debugging

### Code Style

1. **Imports**: Use ES6 module syntax exclusively
   ```typescript
   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   import type { TypeName } from './types.js';
   ```

2. **File Extensions**: Include `.js` extension in import paths (required for ES modules)
   ```typescript
   import { config } from './config.js';  // ✓ Correct
   import { config } from './config';     // ✗ Wrong
   ```

3. **Type Safety**: Leverage TypeScript's strict mode
   - No `any` types unless absolutely necessary
   - Use type guards and validators
   - Leverage Zod for runtime validation

4. **Error Handling**: Always use try-catch blocks and provide meaningful error messages
   ```typescript
   try {
     // code
   } catch (error) {
     logger.error('Operation failed', { error });
     throw new Error(`Descriptive message: ${error}`);
   }
   ```

5. **Async/Await**: Prefer async/await over promises for readability

## Security Considerations

### Critical Security Rules

1. **Read-Only Access**: 
   - The database user MUST have only SELECT privileges
   - NO INSERT, UPDATE, DELETE, CREATE, or DROP permissions
   - Enforced at the database level, not application level

2. **Local Client Only**:
   - This server is designed for trusted local environments
   - No SQL injection protection needed (trusted user context)
   - Focus on preventing resource exhaustion and timeouts

3. **Query Limits**:
   - Maximum rows per query: Configurable (default 1000)
   - Query timeout: Configurable (default 30 seconds)
   - Query length limit: Configurable (default 50,000 characters)

4. **Sensitive Data**:
   - Never commit `.env` files (already in `.gitignore`)
   - Never log database credentials
   - Use environment variables for all secrets

5. **Audit Logging**:
   - All queries are logged with timestamp, execution time, and row count
   - Logs go to stdout/stderr in JSON format
   - Enable with `ENABLE_AUDIT_LOGGING=true`

## Development Workflow

### Building and Testing

```bash
npm run build       # Compile TypeScript to dist/
npm run dev         # Watch mode for development
npm run typecheck   # Type check without compiling
npm run test-client # Run test client (requires valid Oracle DB)
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure Oracle connection details (read-only user)
3. Ensure Node.js v18+ is installed
4. Run `npm install` to install dependencies

### Before Committing

1. Run `npm run typecheck` to ensure no type errors
2. Run `npm run build` to verify compilation succeeds
3. Test with `npm run test-client` if Oracle DB is available
4. Ensure no sensitive data (credentials, .env) is committed

## Testing

### Manual Testing with Test Client

The project includes a test client (`src/client.ts`) that:
1. Spawns the MCP server as a subprocess
2. Sends JSON-RPC requests via stdio
3. Tests tool invocation (query_database, get_database_schema)
4. Validates responses

Run with: `npm run test-client`

**Note**: Requires a valid Oracle database connection configured in `.env`

### Testing Without Oracle DB

If you don't have Oracle DB access:
- Focus on TypeScript compilation (`npm run typecheck`)
- Test MCP protocol logic and tool definitions
- Review code structure and type safety

## MCP Protocol Implementation

### Tool Definitions

The server exposes two tools to Copilot:

1. **query_database**
   - Input: `query` (string), `maxRows` (optional number), `timeout` (optional number)
   - Output: JSON with rows, columns, row count, execution time
   - Validation: Zod schema validates input parameters

2. **get_database_schema**
   - Input: `tableName` (optional string)
   - Output: Table/column information
   - Use case: Help Copilot understand database structure

### stdio Transport

- Server listens on **stdin** for JSON-RPC messages
- Server writes responses to **stdout**
- Logging/debugging goes to **stderr**
- No HTTP server - purely process-based communication

### MCP Client Configuration

Users configure the server in their MCP client (VS Code, Copilot extension):

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

## Common Tasks

### Adding a New MCP Tool

1. Create tool file in `src/tools/`
2. Define Zod schema for input validation
3. Implement tool handler with proper error handling
4. Register tool in `src/server.ts` with `server.setRequestHandler`
5. Update README with tool documentation
6. Test with test client

### Modifying Query Execution

- Edit `src/database/queryExecutor.ts`
- Maintain query timeout enforcement
- Keep result size limits
- Preserve audit logging
- Handle Oracle-specific error codes

### Updating Configuration

- Add new config fields to `src/config.ts`
- Define Zod schema for validation
- Update `.env.example` with new variables
- Document in README

## Oracle Thin Mode (No Instant Client Required)

This project uses **oracledb in Thin Mode**, which is a pure JavaScript implementation. This means:

- ✅ No Oracle Instant Client installation needed
- ✅ Works out of the box on any platform (Windows, macOS, Linux)
- ✅ Simpler deployment and setup
- ✅ Suitable for most use cases

If Thick Mode is needed (rarely):
1. Install Oracle Instant Client
2. Call `oracledb.initOracleClient()` before creating the connection pool
3. Update documentation

## Troubleshooting

### TypeScript Compilation Errors

- Check that imports include `.js` extension
- Verify ES2022 module syntax (no `require`)
- Ensure types are properly imported
- Run `npm run typecheck` for detailed errors

### Oracle Connection Issues

- Verify connection string format: `hostname:port/servicename`
- Check database user has SELECT privileges
- Test connectivity with SQL*Plus or another tool first
- Review logs in stderr for detailed error messages

### MCP Protocol Issues

- Verify server compiles successfully (`npm run build`)
- Check that stdio transport is working (not buffered)
- Review JSON-RPC message format in logs
- Test with the built-in test client first

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Oracle Node.js Driver Docs](https://node-oracledb.readthedocs.io/)
- [GitHub Copilot Extensions](https://docs.github.com/en/copilot)
- [Zod Validation Library](https://zod.dev/)

## Best Practices for Copilot

When working with Copilot on this project:

1. **Understand the architecture**: This is an MCP server, not a web API
2. **Respect read-only constraint**: Never suggest write operations
3. **Maintain type safety**: Use TypeScript types and Zod validation
4. **Test incrementally**: Build and test after each change
5. **Consider Oracle-specific features**: Leverage Oracle SQL syntax when appropriate
6. **Keep it simple**: Minimal dependencies, focused functionality
7. **Document changes**: Update README and comments for complex logic
