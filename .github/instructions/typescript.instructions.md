---
applyTo: "**/*.ts"
description: TypeScript coding standards for Oracle MCP project
---

# TypeScript Guidelines for Oracle MCP Server

## Type Safety
- Use explicit type annotations for all function parameters and return types
- Prefer `interface` over `type` for object shapes
- Never use `any` - use `unknown` with type guards instead
- Import types from `oracledb` package when working with database code
- Use Zod schemas for runtime validation

## Module Imports
- All ES module imports must include `.js` extension (required for Node.js ESM)
- Example: `import { getConfig } from './config.js'`
- Never use relative imports without extensions

## Async/Await
- Use `async/await` over `.then()` chains
- Always handle errors with try/catch blocks
- Use `Promise.all()` for parallel operations
- Example:
  ```typescript
  try {
    const result = await executeQuery(query);
    return result;
  } catch (error) {
    logger.error('Query failed', { error });
    throw error;
  }
  ```

## Error Handling
- Use typed errors with proper error messages
- Log errors with context using Winston logger
- Never swallow errors silently
- Return error responses in MCP-compliant format

## Database Code
- Always use connection pooling
- Close connections properly in finally blocks
- Use prepared statements (Oracle handles this)
- Validate query parameters with Zod
- Set appropriate timeouts for queries

## MCP Server Code
- Register tools via `setRequestHandler(ListToolsRequestSchema, ...)`
- Return responses with `content` array
- Use Zod for input validation
- Include proper error responses
- Log all tool calls for auditing

## Code Organization
- One tool per file in `src/tools/`
- Keep functions focused and single-purpose
- Export interfaces from `types.ts` files
- Use barrel exports sparingly

## Documentation
- Add JSDoc comments for exported functions
- Include examples in comments
- Document all Zod schemas
- Keep comments concise and relevant
