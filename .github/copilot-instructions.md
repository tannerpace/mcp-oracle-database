# Oracle MCP Server - Copilot Instructions

## Project Overview
This is a Model Context Protocol (MCP) server that enables AI assistants like GitHub Copilot to execute read-only SQL queries against Oracle databases.

## Database Information
- **Database Type**: Oracle Database 21c Express Edition (or compatible)
- **Access Method**: Via MCP server with stdio transport
- **Security**: Read-only user with SELECT-only privileges
- **Connection**: Uses node-oracledb in Thin Mode (no Oracle Client required)

## Available MCP Tools

When working with database queries, you have access to these MCP tools:

### 1. `query_database`
Execute SELECT queries against the Oracle database.
- **Input**: SQL query string, optional maxRows and timeout
- **Returns**: Result rows, column names, execution metrics
- **Example**: `SELECT * FROM employees WHERE department = 'Engineering'`

### 2. `get_database_schema`
Get database schema information.
- **Input**: Optional table name
- **Returns**: List of tables (if no table specified) or column details (if table specified)
- **Example**: Get all tables or get columns for specific table

## Coding Practices

### TypeScript
- Use strict TypeScript with explicit type annotations
- Import types from `oracledb` package when working with database code
- Use Zod for runtime validation (see `src/config.ts`)
- All imports must include `.js` extension for ES modules compatibility
- Use `async/await` for asynchronous operations
- Handle errors gracefully with try/catch blocks

### SQL Queries
- Write SQL keywords in UPPERCASE (SELECT, FROM, WHERE, etc.)
- Always test queries for performance before deployment
- Use appropriate WHERE clauses to limit result sets
- Prefer FETCH FIRST n ROWS ONLY over ROWNUM
- Include meaningful table aliases
- Avoid SELECT * - specify columns explicitly

### MCP Server Development
- Tools are registered via `setRequestHandler(ListToolsRequestSchema, ...)` and `setRequestHandler(CallToolRequestSchema, ...)`
- Use Zod schemas for input validation
- Return results in MCP-compliant format with `content` array
- Log all operations for audit trail
- Always clean up resources (connection pools) on shutdown

## Project Structure
```
src/
├── server.ts              # Main MCP server entry point
├── client.ts              # Test client for local validation
├── config.ts              # Configuration with Zod validation
├── database/
│   ├── oracleConnection.ts  # Connection pool manager
│   ├── queryExecutor.ts     # Query execution with limits
│   └── types.ts             # Database type definitions
├── tools/
│   ├── queryDatabase.ts     # query_database tool
│   └── getSchema.ts         # get_database_schema tool
└── logging/
    └── logger.ts            # Winston-based logging
```

## Environment Variables
Required in `.env` file:
- `ORACLE_CONNECTION_STRING`: Format `hostname:port/servicename`
- `ORACLE_USER`: Database username (preferably read-only)
- `ORACLE_PASSWORD`: Database password
- `ORACLE_POOL_MIN`, `ORACLE_POOL_MAX`: Connection pool settings
- `QUERY_TIMEOUT_MS`: Query timeout in milliseconds
- `MAX_ROWS_PER_QUERY`: Maximum rows returned per query

## Common Tasks

### Adding a New MCP Tool
1. Create new file in `src/tools/`
2. Define Zod schema for input validation
3. Implement tool function that returns MCP-compliant response
4. Register tool in `src/server.ts` tools array
5. Add handler in CallToolRequestSchema handler
6. Update documentation

### Testing
- Run `npm run build` to compile TypeScript
- Run `npm run test-client` to execute test suite
- Check logs in `logs/mcp-server.log`
- Verify all tests pass before committing

### Security Considerations
- Never commit `.env` file (included in `.gitignore`)
- Use read-only database user
- Validate all inputs with Zod schemas
- Log all queries for audit trail
- Enforce query timeouts and row limits

## Integration with Copilot

When Copilot asks about database operations:
1. **First**, use `get_database_schema` to understand available tables and columns
2. **Then**, construct appropriate SQL query
3. **Finally**, use `query_database` to execute and return results

Example workflow:
```
User: "Show me all employees in the Engineering department"

Copilot:
1. Calls get_database_schema() to see available tables
2. Identifies "EMPLOYEES" table with relevant columns
3. Calls query_database({ 
     query: "SELECT * FROM employees WHERE department = 'Engineering' FETCH FIRST 100 ROWS ONLY" 
   })
4. Returns formatted results to user
```

## Best Practices
- Keep custom instructions short and focused
- Update this file when project structure changes
- Include examples for common operations
- Document any Oracle-specific SQL syntax
- Reference actual file paths and function names
- Keep security guidelines prominent
