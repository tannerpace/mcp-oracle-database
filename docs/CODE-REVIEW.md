# Oracle MCP Server - Architecture & Code Review

**Review Date:** October 2025  
**Project:** mcp-oracle-database  
**Version:** 1.0.0  
**Reviewer:** Architecture & Security Analysis

---

## Executive Summary

This is a comprehensive review of the Oracle MCP (Model Context Protocol) server that enables LLMs like GitHub Copilot to execute read-only SQL queries against Oracle databases. The project is well-designed for its core use case, with a clean architecture and good separation of concerns. However, there are several opportunities for improvement in security, robustness, performance, and maintainability.

**Overall Assessment:** ⭐⭐⭐⭐ (4/5)
- **Strengths:** Clean architecture, good TypeScript usage, effective MCP integration
- **Concerns:** SQL injection vulnerability, missing query timeout enforcement, limited error handling, no test suite

---

## 1. Summary of Current State

### Architecture Overview

```
MCP Client (VS Code/Claude)
         ↓ stdio (JSON-RPC)
    server.ts (MCP Server)
         ↓
    tools/ (queryDatabase, getSchema)
         ↓
    database/queryExecutor.ts
         ↓
    database/oracleConnection.ts (Connection Pool)
         ↓
    Oracle Database (Read-only user)
```

### Core Components

1. **Bootstrapping (`server.ts`)**: MCP server initialization, tool registration, stdio transport
2. **Connection Pooling (`oracleConnection.ts`)**: Oracle connection pool management using node-oracledb
3. **Query Executor (`queryExecutor.ts`)**: Query execution with limits and timeout configuration
4. **Schema Tool (`getSchema.ts`)**: Database schema introspection
5. **Query Tool (`queryDatabase.ts`)**: SQL query execution wrapper
6. **Logging (`logger.ts`)**: Custom file-based logging with audit trail
7. **Configuration (`config.ts`)**: Zod-validated environment configuration

### Technology Stack

- **Runtime:** Node.js 18+, ES Modules
- **Language:** TypeScript (strict mode)
- **Database:** Oracle via node-oracledb (Thin Mode - no client required)
- **Protocol:** MCP SDK (@modelcontextprotocol/sdk)
- **Validation:** Zod schemas
- **Logging:** Custom logger (file + console)

### Project Metrics

- **Lines of Code:** ~800 lines (TypeScript)
- **Dependencies:** 4 runtime (MCP SDK, oracledb, dotenv, zod)
- **Test Coverage:** 0% (no automated tests)
- **Documentation:** Extensive (README, multiple guides)

---

## 2. Key Strengths

### ✅ Clean Architecture & Separation of Concerns

**Strong Points:**
- Clear separation between MCP protocol layer, business logic, and database access
- Tools are isolated in their own modules with clear interfaces
- Configuration is centralized and validated with Zod
- Database connection pooling is properly abstracted

**Example:**
```typescript
// server.ts focuses on MCP protocol
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Delegates to tool-specific modules
  const result = await queryDatabase(validated);
});

// queryDatabase.ts focuses on business logic
export async function queryDatabase(input: QueryDatabaseInput) {
  // Validates input and delegates to executor
  return executeQuery(validated.query, options);
}
```

### ✅ Good TypeScript Usage

**Strong Points:**
- Strict TypeScript configuration (`strict: true`, `noUnusedLocals`, etc.)
- Proper type imports from node-oracledb
- ES Modules with `.js` extensions for imports (correctly configured)
- Zod schemas for runtime validation
- Explicit type annotations on function parameters and return types

**Example:**
```typescript
export async function executeQuery(
  query: string,
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  // Clear type safety throughout
}
```

### ✅ Effective MCP Integration

**Strong Points:**
- Proper tool registration with JSON schema definitions
- Correct stdio transport implementation
- Good error handling in MCP response format
- Graceful shutdown handling for SIGINT/SIGTERM

### ✅ Connection Pool Management

**Strong Points:**
- Lazy pool initialization (created on first use)
- Proper connection release in finally blocks
- Configurable pool size (min/max)
- Graceful pool closure with drain timeout

### ✅ Comprehensive Documentation

**Strong Points:**
- Detailed README with setup instructions
- Multiple integration guides (VS Code, Claude Desktop)
- Quick start guide for new users
- Architecture diagrams and examples

---

## 3. Key Weaknesses / Risks

### 🚨 CRITICAL: SQL Injection Vulnerability

**Issue:** The `getSchema()` function in `queryExecutor.ts` uses string interpolation for the table name, creating a SQL injection vulnerability.

**Location:** `src/database/queryExecutor.ts:106`

```typescript
// VULNERABLE CODE
query = `
  SELECT column_name, data_type, data_length, nullable
  FROM user_tab_columns
  WHERE table_name = UPPER('${tableName}')  // ⚠️ SQL INJECTION
  ORDER BY column_id
`;
```

**Risk Level:** HIGH - Even with a read-only user, this allows:
- Information disclosure about other schemas
- Potential SQL parsing errors that reveal database structure
- Possible DoS through expensive queries

**Exploits:**
```typescript
// Attacker could provide:
tableName: "') OR 1=1 --"
tableName: "'; SELECT * FROM ALL_USERS --"
```

### 🚨 HIGH: Query Timeout Not Enforced

**Issue:** The `timeout` parameter is accepted but never used. Oracle queries can run indefinitely.

**Location:** `src/database/queryExecutor.ts:14`

```typescript
export async function executeQuery(
  query: string,
  options: { maxRows?: number; timeout?: number } = {}  // timeout accepted
): Promise<QueryResult> {
  // ... but never used in connection.execute()
  const result = await connection.execute(query, [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    maxRows,
    // ⚠️ No timeout enforcement
  });
}
```

**Risk Level:** HIGH
- Long-running queries can block connections
- Connection pool exhaustion
- Resource starvation under load

### ⚠️ MEDIUM: Missing Query Type Validation

**Issue:** No verification that queries are SELECT-only. While a read-only user should prevent writes, defense in depth is missing.

**Risk Level:** MEDIUM
- Relies solely on database permissions
- No early rejection of invalid queries
- Poor error messages for non-SELECT attempts

**Example Missing Validation:**
```typescript
// Should verify query is SELECT before execution
if (!query.trim().toUpperCase().startsWith('SELECT')) {
  throw new Error('Only SELECT queries are allowed');
}
```

### ⚠️ MEDIUM: Insufficient Error Handling

**Issues:**
1. Generic error messages expose internal details
2. No differentiation between error types (network, SQL syntax, permission)
3. Stack traces could leak sensitive information

**Location:** `src/database/queryExecutor.ts:63`

```typescript
catch (err: any) {
  // Generic error - could expose internals
  throw new Error(`Query failed: ${err.message}`);
}
```

### ⚠️ MEDIUM: Configuration Security

**Issues:**
1. Optional connection credentials allow startup without validation
2. No minimum security requirements (e.g., password strength)
3. Credentials logged in connection pool initialization

**Location:** `src/config.ts:7-9`

```typescript
const configSchema = z.object({
  ORACLE_CONNECTION_STRING: z.string().optional(),  // ⚠️ Should be required
  ORACLE_USER: z.string().optional(),
  ORACLE_PASSWORD: z.string().optional(),
  // ...
});
```

**Location:** `src/database/oracleConnection.ts:29-34`

```typescript
logger.info('Creating Oracle connection pool (read-only)', {
  connectionString: poolConfig.connectionString,
  user: poolConfig.user,  // ⚠️ Logs credentials
  poolMin: poolConfig.poolMin,
  poolMax: poolConfig.poolMax,
});
```

### ⚠️ MEDIUM: Duplicate Signal Handlers

**Issue:** Signal handlers (SIGINT/SIGTERM) are registered in both `server.ts` and `oracleConnection.ts`, leading to duplicate cleanup.

**Locations:**
- `src/server.ts:138-150`
- `src/database/oracleConnection.ts:74-84`

**Risk:** Race conditions during shutdown, multiple `process.exit()` calls

### ⚠️ LOW: No Query Result Streaming

**Issue:** All query results are loaded into memory at once. Large result sets (up to MAX_ROWS_PER_QUERY = 1000) could cause memory pressure.

**Impact:** Limited scalability for queries returning many wide rows

### ⚠️ LOW: Limited Logging Capabilities

**Issues:**
1. Custom logger instead of industry-standard Winston/Pino
2. No log levels for file logging (all levels written)
3. No log rotation (files grow indefinitely)
4. Manual JSON formatting (error-prone)

### ⚠️ LOW: No Test Coverage

**Issue:** No automated tests exist for:
- Query execution
- Error handling
- Connection pool behavior
- MCP tool integration
- Configuration validation

**Current Testing:** Manual client (`src/client.ts`) only

---

## 4. High-Priority Improvement Items

### 🔴 Priority 1: Fix SQL Injection Vulnerability

**Why:** Critical security issue that must be addressed before production use.

**Solution:** Use parameterized queries for the table name filter.

**Implementation:**
```typescript
// BEFORE (VULNERABLE):
query = `
  SELECT column_name, data_type, data_length, nullable
  FROM user_tab_columns
  WHERE table_name = UPPER('${tableName}')
  ORDER BY column_id
`;

// AFTER (SECURE):
export async function getSchema(tableName?: string): Promise<any> {
  let query: string;
  let binds: any[] = [];

  if (tableName) {
    // Parameterized query
    query = `
      SELECT column_name, data_type, data_length, nullable
      FROM user_tab_columns
      WHERE table_name = UPPER(:tableName)
      ORDER BY column_id
    `;
    binds = [tableName];
  } else {
    query = `
      SELECT table_name, tablespace_name
      FROM user_tables
      ORDER BY table_name
    `;
  }

  return executeQueryWithBinds(query, binds, { maxRows: 1000 });
}

// Update executeQuery to support bind parameters
export async function executeQuery(
  query: string,
  binds: any[] | Record<string, any> = [],
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  // ...
  const result = await connection.execute(query, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    maxRows,
  });
  // ...
}
```

**Testing:**
```typescript
// Add tests for SQL injection attempts
test('getSchema should prevent SQL injection', async () => {
  const malicious = "'; DROP TABLE users; --";
  const result = await getSchema(malicious);
  // Should safely return 0 rows, not execute DROP
  expect(result.rowCount).toBe(0);
});
```

### 🔴 Priority 2: Implement Query Timeout

**Why:** Prevents resource exhaustion from long-running queries.

**Solution:** Use Oracle's `DBMS_SESSION.SET_SQL_TRACE` or implement application-level timeout with `Promise.race()`.

**Implementation Option 1 (Preferred - Oracle callTimeout):**
```typescript
export async function executeQuery(
  query: string,
  binds: any[] = [],
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  const maxRows = options.maxRows || config.MAX_ROWS_PER_QUERY;
  const timeout = options.timeout || config.QUERY_TIMEOUT_MS;
  const startTime = Date.now();

  let connection;

  try {
    connection = await getConnection();

    // Set call timeout (node-oracledb 5.2+)
    const result = await connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows,
      extendedMetaData: true,
    });

    // Note: connection.callTimeout is set at connection level
    // Better: use connection.execute with a timeout wrapper
    
    const executionTime = Date.now() - startTime;
    // ... rest of implementation
  }
}
```

**Implementation Option 2 (Application-level timeout):**
```typescript
export async function executeQuery(
  query: string,
  binds: any[] = [],
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  const maxRows = options.maxRows || config.MAX_ROWS_PER_QUERY;
  const timeout = options.timeout || config.QUERY_TIMEOUT_MS;
  
  let connection;

  try {
    connection = await getConnection();

    // Wrap execution with timeout
    const executePromise = connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows,
      extendedMetaData: true,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
    });

    const result = await Promise.race([executePromise, timeoutPromise]);
    
    // ... rest of implementation
  } catch (err: any) {
    if (err.message.includes('Query timeout')) {
      // Attempt to cancel the query on the connection
      if (connection) {
        try {
          await connection.break(); // Cancel running operation
        } catch (breakErr) {
          logger.error('Failed to cancel timed-out query', { error: breakErr });
        }
      }
    }
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}
```

### 🔴 Priority 3: Validate Query Type (SELECT-only)

**Why:** Defense in depth - don't rely solely on database permissions.

**Solution:** Implement query type validation before execution.

**Implementation:**
```typescript
/**
 * Validate that a query is a SELECT statement
 */
function validateSelectQuery(query: string): void {
  const normalized = query.trim().toUpperCase();
  
  // Must start with SELECT (allowing whitespace and comments)
  const selectPattern = /^\s*(\/\*.*?\*\/)?\s*SELECT\s/i;
  
  if (!selectPattern.test(query)) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Blacklist dangerous keywords (even in read-only mode)
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
  ];
  
  for (const keyword of dangerousKeywords) {
    // Simple check - may need refinement for subqueries
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(normalized)) {
      throw new Error(`Query contains disallowed keyword: ${keyword}`);
    }
  }
}

export async function executeQuery(
  query: string,
  binds: any[] = [],
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  // Validate query type first
  validateSelectQuery(query);
  
  // Validate query length
  if (query.length > config.MAX_QUERY_LENGTH) {
    throw new Error(`Query exceeds maximum length of ${config.MAX_QUERY_LENGTH} characters`);
  }

  // ... rest of implementation
}
```

**Considerations:**
- This is not foolproof (can be bypassed with clever SQL)
- Primary security is still the read-only database user
- Provides better error messages and early rejection

### 🟡 Priority 4: Improve Error Handling & Error Messages

**Why:** Better debugging, security (no internal detail leakage), user experience.

**Solution:** Categorize errors and provide context-appropriate messages.

**Implementation:**
```typescript
// src/database/errors.ts (new file)

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'QUERY_ERROR', cause);
    this.name = 'QueryError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends DatabaseError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

/**
 * Categorize Oracle errors and return appropriate error type
 */
export function categorizeOracleError(err: any): DatabaseError {
  const errorCode = err.errorNum || err.code;
  const message = err.message || String(err);

  // Connection errors
  if ([12545, 12154, 12514, 1017].includes(errorCode)) {
    return new ConnectionError('Database connection failed', err);
  }

  // Permission errors
  if ([942, 1031].includes(errorCode)) {
    return new QueryError('Insufficient privileges or table does not exist', err);
  }

  // Syntax errors
  if ([900, 904, 923, 933].includes(errorCode)) {
    return new QueryError('SQL syntax error', err);
  }

  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return new TimeoutError('Query execution timeout');
  }

  // Generic query error
  return new QueryError('Query execution failed', err);
}

// Update executeQuery to use categorized errors:
export async function executeQuery(
  query: string,
  binds: any[] = [],
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  // ... implementation
  
  try {
    const result = await connection.execute(query, binds, executeOptions);
    // ... success path
  } catch (err: any) {
    const categorized = categorizeOracleError(err);
    
    logger.error('Query execution failed', {
      errorType: categorized.name,
      errorCode: categorized.code,
      query: query.substring(0, 200),
      executionTime: Date.now() - startTime,
    });

    // Audit log failure
    audit('Query execution failed', {
      errorType: categorized.name,
      query: query.substring(0, 500),
      executionTime: Date.now() - startTime,
    });

    // Throw user-friendly error (not internal details)
    throw categorized;
  }
}
```

### 🟡 Priority 5: Secure Configuration

**Why:** Prevent startup with invalid configuration, improve security posture.

**Solution:** Make credentials required, add validation, remove credential logging.

**Implementation:**
```typescript
// src/config.ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Required connection parameters
  ORACLE_CONNECTION_STRING: z.string().min(1, 'Oracle connection string is required'),
  ORACLE_USER: z.string().min(1, 'Oracle user is required'),
  ORACLE_PASSWORD: z.string().min(1, 'Oracle password is required'),
  
  // Pool settings with validation
  ORACLE_POOL_MIN: z.coerce.number().int().min(1).max(10).default(2),
  ORACLE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  
  // Query settings
  QUERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
  MAX_ROWS_PER_QUERY: z.coerce.number().int().min(1).max(10000).default(1000),
  MAX_QUERY_LENGTH: z.coerce.number().int().min(1).max(1000000).default(50000),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  ENABLE_FILE_LOGGING: z.coerce.boolean().default(true),
  LOG_DIR: z.string().default('./logs'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server metadata
  MCP_TRANSPORT: z.string().default('stdio'),
  SERVER_NAME: z.string().default('oracle-mcp-server'),
  SERVER_VERSION: z.string().default('1.0.0'),
}).refine(
  (data) => data.ORACLE_POOL_MIN <= data.ORACLE_POOL_MAX,
  {
    message: 'ORACLE_POOL_MIN must be less than or equal to ORACLE_POOL_MAX',
    path: ['ORACLE_POOL_MIN'],
  }
);

export type Config = z.infer<typeof configSchema>;

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached) return cached;
  
  try {
    const parsed = configSchema.parse(process.env);
    cached = parsed;
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }
    throw error;
  }
}

export default getConfig;
```

**Update connection logging:**
```typescript
// src/database/oracleConnection.ts
logger.info('Creating Oracle connection pool (read-only)', {
  connectionString: poolConfig.connectionString,
  user: poolConfig.user.substring(0, 3) + '***', // Redact username
  poolMin: poolConfig.poolMin,
  poolMax: poolConfig.poolMax,
  // NEVER log password
});
```

### 🟡 Priority 6: Fix Duplicate Signal Handlers

**Why:** Prevents race conditions and ensures clean shutdown.

**Solution:** Centralize signal handling in one location.

**Implementation:**
```typescript
// src/server.ts - Keep signal handlers here (application entry point)
// Remove signal handlers from oracleConnection.ts

// src/database/oracleConnection.ts - Remove these:
/*
process.on('SIGINT', async () => { ... });
process.on('SIGTERM', async () => { ... });
*/

// Only keep these in server.ts:
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully (SIGINT)');
  try {
    await closePool(); // Close pool first
    await server.close(); // Then close MCP server
  } catch (err) {
    logger.error('Error during shutdown', { error: err });
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully (SIGTERM)');
  try {
    await closePool();
    await server.close();
  } catch (err) {
    logger.error('Error during shutdown', { error: err });
  }
  process.exit(0);
});

// Add uncaught exception handler for safety
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err });
  closePool().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  closePool().finally(() => process.exit(1));
});
```

---

## 5. Medium & Long-Term Improvement Ideas

### 🟢 Medium-Term: Add Comprehensive Test Suite

**Why:** Currently 0% test coverage. Tests improve confidence, catch regressions, document behavior.

**What to Test:**
1. **Unit Tests:**
   - Configuration validation
   - Query validation (SELECT-only check)
   - Error categorization
   - Bind parameter handling

2. **Integration Tests:**
   - Connection pool lifecycle
   - Query execution with real/mock Oracle
   - Schema introspection
   - Timeout behavior
   - Error handling paths

3. **MCP Protocol Tests:**
   - Tool discovery
   - Tool invocation
   - Error responses
   - Graceful shutdown

**Implementation Approach:**

```typescript
// package.json - add test dependencies
{
  "devDependencies": {
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "vitest": "^1.0.0",        // Fast, modern test framework
    "@vitest/ui": "^1.0.0",    // UI for test results
    "testcontainers": "^10.0.0" // For Oracle container in tests
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

```typescript
// src/database/__tests__/queryExecutor.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeQuery } from '../queryExecutor.js';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('Query Executor', () => {
  let oracleContainer: StartedTestContainer;

  beforeAll(async () => {
    // Start Oracle container for integration tests
    oracleContainer = await new GenericContainer('gvenzl/oracle-xe:21-slim')
      .withExposedPorts(1521)
      .withEnvironment({ ORACLE_PASSWORD: 'test123' })
      .start();
  }, 60000);

  afterAll(async () => {
    await oracleContainer.stop();
  });

  it('should execute SELECT query successfully', async () => {
    const result = await executeQuery(
      'SELECT * FROM dual',
      [],
      { maxRows: 10 }
    );

    expect(result.rowCount).toBe(1);
    expect(result.columns).toContain('DUMMY');
  });

  it('should reject non-SELECT queries', async () => {
    await expect(
      executeQuery('DROP TABLE users', [])
    ).rejects.toThrow('Only SELECT queries are allowed');
  });

  it('should timeout long-running queries', async () => {
    await expect(
      executeQuery(
        'SELECT * FROM all_objects WHERE rownum < 1000000',
        [],
        { timeout: 100 } // 100ms timeout
      )
    ).rejects.toThrow('Query timeout');
  }, 10000);

  it('should use bind parameters safely', async () => {
    const result = await executeQuery(
      'SELECT :value as test FROM dual',
      { value: "'; DROP TABLE users; --" }
    );

    expect(result.rowCount).toBe(1);
    // Should treat as literal string, not SQL injection
  });
});
```

### 🟢 Medium-Term: Replace Custom Logger with Industry Standard

**Why:** Custom logger lacks features (rotation, levels, structured logging), harder to maintain.

**Recommendation:** Use Pino (high performance) or Winston (feature-rich)

**Implementation with Pino:**

```typescript
// package.json
{
  "dependencies": {
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0"
  }
}

// src/utils/logger.ts
import pino from 'pino';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level: logLevel,
  
  // Development: pretty print to console
  // Production: structured JSON
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    }
  } : undefined,
  
  // Base fields
  base: {
    service: 'oracle-mcp-server',
  },
  
  // Timestamp format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// Audit logger (separate file with rotation)
export const auditLogger = pino({
  level: 'info',
  transport: process.env.ENABLE_FILE_LOGGING === 'true' ? {
    target: 'pino/file',
    options: {
      destination: path.join(process.env.LOG_DIR || './logs', 'audit.log'),
      mkdir: true,
    }
  } : undefined,
});

export function audit(message: string, meta?: Record<string, unknown>) {
  if (process.env.ENABLE_AUDIT_LOGGING === 'true') {
    auditLogger.info({ audit: true, ...meta }, message);
  }
}

export default logger;
```

**Benefits:**
- Automatic log rotation (with pino-rotate or pino-roll)
- Structured JSON logging
- Better performance (10x faster than Winston)
- Child loggers for context
- Redaction support for secrets

### 🟢 Medium-Term: Query Result Streaming

**Why:** Large result sets (1000 rows × many columns) can cause memory pressure.

**Solution:** Stream results instead of loading all into memory.

**Implementation:**

```typescript
// src/database/queryExecutor.ts
import oracledb from 'oracledb';

/**
 * Stream query results for large datasets
 */
export async function* streamQueryResults(
  query: string,
  binds: any[] = [],
  options: { timeout?: number } = {}
): AsyncGenerator<Record<string, any>, void, unknown> {
  let connection;

  try {
    validateSelectQuery(query);
    connection = await getConnection();

    const stream = connection.queryStream(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    for await (const row of stream) {
      yield row as Record<string, any>;
    }

  } catch (err: any) {
    const categorized = categorizeOracleError(err);
    logger.error('Query streaming failed', {
      errorType: categorized.name,
      query: query.substring(0, 200),
    });
    throw categorized;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// For MCP tools, still use executeQuery (buffered)
// But provide streaming option for future extensions
```

### 🟢 Medium-Term: Schema Caching

**Why:** Schema introspection queries run every time. Tables/columns don't change frequently.

**Solution:** Cache schema metadata with TTL.

**Implementation:**

```typescript
// src/database/schemaCache.ts
interface CachedSchema {
  tables?: QueryResult;
  columns: Map<string, QueryResult>;
  lastUpdated: Date;
}

class SchemaCache {
  private cache: CachedSchema = {
    columns: new Map(),
    lastUpdated: new Date(),
  };
  
  private ttl = 5 * 60 * 1000; // 5 minutes

  isExpired(): boolean {
    return Date.now() - this.cache.lastUpdated.getTime() > this.ttl;
  }

  async getTables(): Promise<QueryResult | null> {
    if (this.isExpired()) return null;
    return this.cache.tables || null;
  }

  setTables(tables: QueryResult): void {
    this.cache.tables = tables;
    this.cache.lastUpdated = new Date();
  }

  async getTableColumns(tableName: string): Promise<QueryResult | null> {
    if (this.isExpired()) return null;
    return this.cache.columns.get(tableName.toUpperCase()) || null;
  }

  setTableColumns(tableName: string, columns: QueryResult): void {
    this.cache.columns.set(tableName.toUpperCase(), columns);
    this.cache.lastUpdated = new Date();
  }

  clear(): void {
    this.cache = {
      columns: new Map(),
      lastUpdated: new Date(),
    };
  }
}

export const schemaCache = new SchemaCache();

// Update getSchema to use cache
export async function getSchema(tableName?: string): Promise<any> {
  if (tableName) {
    // Check cache first
    const cached = await schemaCache.getTableColumns(tableName);
    if (cached) {
      logger.debug('Schema cache hit', { tableName });
      return cached;
    }
  } else {
    const cached = await schemaCache.getTables();
    if (cached) {
      logger.debug('Tables cache hit');
      return cached;
    }
  }

  // Cache miss - execute query
  const result = await executeQueryInternal(...);
  
  // Update cache
  if (tableName) {
    schemaCache.setTableColumns(tableName, result);
  } else {
    schemaCache.setTables(result);
  }

  return result;
}
```

### 🔵 Long-Term: Query Execution Plan Analysis

**Why:** Help users optimize slow queries by showing execution plans.

**Implementation:**

```typescript
// New tool: explain_query
export const ExplainQuerySchema = z.object({
  query: z.string().min(1),
});

export async function explainQuery(input: { query: string }) {
  validateSelectQuery(input.query);

  const explainQuery = `EXPLAIN PLAN FOR ${input.query}`;
  
  await executeQuery(explainQuery, []);
  
  const planQuery = `
    SELECT plan_table_output 
    FROM TABLE(DBMS_XPLAN.DISPLAY())
  `;
  
  const result = await executeQuery(planQuery, [], { maxRows: 1000 });
  
  return {
    success: true,
    plan: result.rows.map(r => r.PLAN_TABLE_OUTPUT).join('\n'),
  };
}
```

### 🔵 Long-Term: Multi-Database Support

**Why:** Users may need to query multiple Oracle instances.

**Implementation:**

```typescript
// src/config.ts - support multiple databases
const configSchema = z.object({
  // Default database
  ORACLE_CONNECTION_STRING: z.string().min(1),
  ORACLE_USER: z.string().min(1),
  ORACLE_PASSWORD: z.string().min(1),
  
  // Additional databases (optional)
  DATABASES: z.array(z.object({
    name: z.string(),
    connectionString: z.string(),
    user: z.string(),
    password: z.string(),
  })).optional(),
  
  // ... rest of config
});

// src/database/oracleConnection.ts - manage multiple pools
const pools = new Map<string, OraclePool>();

export async function getPool(databaseName: string = 'default'): Promise<OraclePool> {
  // Return pool for specified database
}

// Update tools to accept database parameter
export const QueryDatabaseSchema = z.object({
  query: z.string().min(1),
  database: z.string().optional(), // Which database to query
  maxRows: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});
```

### 🔵 Long-Term: Query History & Analytics

**Why:** Track query patterns, identify slow queries, provide usage metrics.

**Implementation:**

```typescript
// src/database/queryHistory.ts
interface QueryHistoryEntry {
  id: string;
  query: string;
  executionTime: number;
  rowCount: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

class QueryHistory {
  private history: QueryHistoryEntry[] = [];
  private maxEntries = 1000;

  add(entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>): void {
    this.history.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    });

    // Trim to max size
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(-this.maxEntries);
    }
  }

  getStats() {
    const successful = this.history.filter(h => h.success);
    const failed = this.history.filter(h => !h.success);

    return {
      totalQueries: this.history.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      avgExecutionTime: successful.reduce((sum, h) => sum + h.executionTime, 0) / successful.length,
      slowestQueries: successful.sort((a, b) => b.executionTime - a.executionTime).slice(0, 10),
    };
  }
}

export const queryHistory = new QueryHistory();

// New MCP tool to expose query statistics
export async function getQueryStats() {
  return {
    success: true,
    data: queryHistory.getStats(),
  };
}
```

### 🔵 Long-Term: Rate Limiting & Resource Quotas

**Why:** Prevent abuse, especially when deployed as a shared service.

**Implementation:**

```typescript
// src/middleware/rateLimiter.ts
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequestsPerMinute = 60;
  private maxConcurrentQueries = 5;
  private activeQueries = 0;

  async checkLimit(clientId: string = 'default'): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Get recent requests for this client
    const recent = this.requests.get(clientId) || [];
    const recentInWindow = recent.filter(t => t > oneMinuteAgo);

    if (recentInWindow.length >= this.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded: too many requests per minute');
    }

    if (this.activeQueries >= this.maxConcurrentQueries) {
      throw new Error('Too many concurrent queries');
    }

    // Update request log
    recentInWindow.push(now);
    this.requests.set(clientId, recentInWindow);
  }

  acquire(): void {
    this.activeQueries++;
  }

  release(): void {
    this.activeQueries--;
  }
}

export const rateLimiter = new RateLimiter();

// Use in executeQuery
export async function executeQuery(...) {
  await rateLimiter.checkLimit();
  rateLimiter.acquire();
  
  try {
    // ... execute query
  } finally {
    rateLimiter.release();
  }
}
```

### 🔵 Long-Term: Database Connection Health Checks

**Why:** Proactively detect connection issues before queries fail.

**Implementation:**

```typescript
// src/database/healthCheck.ts
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  poolStats: any;
}> {
  const start = Date.now();
  
  try {
    const pool = await getOrCreatePool();
    const connection = await pool.getConnection();
    
    try {
      // Simple health check query
      await connection.execute('SELECT 1 FROM DUAL');
      
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency,
        poolStats: {
          connectionsInUse: pool.connectionsInUse,
          connectionsOpen: pool.connectionsOpen,
          poolMin: config.ORACLE_POOL_MIN,
          poolMax: config.ORACLE_POOL_MAX,
        }
      };
    } finally {
      await connection.close();
    }
  } catch (err) {
    logger.error('Health check failed', { error: err });
    return {
      healthy: false,
      latency: Date.now() - start,
      poolStats: null,
    };
  }
}

// Periodic health checks
setInterval(async () => {
  const health = await checkDatabaseHealth();
  if (!health.healthy) {
    logger.warn('Database health check failed', health);
  }
}, 60000); // Every minute
```

---

## 6. Prioritized Roadmap

### Phase 1: Critical Security Fixes (Week 1)
**Must Do Before Production:**

1. ✅ **Fix SQL injection in getSchema()** - Use bind parameters
2. ✅ **Implement query timeout** - Prevent resource exhaustion
3. ✅ **Validate SELECT-only queries** - Defense in depth
4. ✅ **Improve error handling** - Categorize errors, no detail leakage
5. ✅ **Secure configuration** - Make credentials required, no logging

**Success Criteria:**
- [ ] All high-priority security issues resolved
- [ ] No SQL injection vulnerabilities
- [ ] Queries respect timeout configuration
- [ ] Server validates all inputs before execution

### Phase 2: Code Quality & Testing (Week 2-3)
**Improve Maintainability:**

1. ✅ **Fix duplicate signal handlers** - Centralize shutdown logic
2. ✅ **Add test suite** - Unit tests, integration tests with testcontainers
3. ✅ **Improve error messages** - User-friendly, informative
4. ✅ **Add code coverage reporting** - Vitest coverage

**Success Criteria:**
- [ ] ≥70% code coverage
- [ ] All critical paths tested
- [ ] CI/CD pipeline with automated tests

### Phase 3: Performance & Scalability (Week 4)
**Optimize for Production:**

1. ✅ **Add schema caching** - Reduce redundant queries
2. ✅ **Replace custom logger with Pino** - Better performance, features
3. ✅ **Implement query result streaming** - For large datasets
4. ✅ **Add connection pool monitoring** - Health checks

**Success Criteria:**
- [ ] Schema queries cached for 5 minutes
- [ ] Logging performance improved
- [ ] Large result sets don't cause memory issues

### Phase 4: Enhanced Features (Month 2)
**Add Value:**

1. ✅ **Query execution plan analysis** - Help optimize slow queries
2. ✅ **Query history and analytics** - Track usage patterns
3. ✅ **Rate limiting** - Prevent abuse
4. ✅ **Improved documentation** - API docs, deployment guide

**Success Criteria:**
- [ ] Users can analyze query performance
- [ ] Metrics available for monitoring
- [ ] Production deployment guide complete

### Phase 5: Enterprise Features (Month 3+)
**Scale Up:**

1. ✅ **Multi-database support** - Query multiple Oracle instances
2. ✅ **Authentication & authorization** - User-based access control
3. ✅ **Query result export** - CSV, JSON, Parquet formats
4. ✅ **Advanced monitoring** - Prometheus metrics, Grafana dashboards

**Success Criteria:**
- [ ] Supports multiple databases
- [ ] Enterprise-ready monitoring
- [ ] Flexible export options

---

## 7. Sample Code: Complete Refactored Query Executor

Here's a comprehensive example showing all high-priority improvements integrated:

```typescript
// src/database/queryExecutor.ts (REFACTORED)

import oracledb from 'oracledb';
import getConfig from '../config.js';
import logger, { audit } from '../utils/logger.js';
import { getConnection } from './oracleConnection.js';
import type { QueryResult } from './types.js';
import {
  ValidationError,
  TimeoutError,
  categorizeOracleError,
} from './errors.js';

const config = getConfig();

/**
 * Validate that a query is a SELECT statement
 */
function validateSelectQuery(query: string): void {
  const normalized = query.trim();
  
  if (normalized.length === 0) {
    throw new ValidationError('Query cannot be empty');
  }

  // Must start with SELECT (allowing whitespace and comments)
  const selectPattern = /^\s*(\/\*.*?\*\/)?\s*SELECT\s/i;
  
  if (!selectPattern.test(query)) {
    throw new ValidationError('Only SELECT queries are allowed');
  }

  // Blacklist dangerous keywords
  const dangerousKeywords = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
  ];
  
  const upperQuery = normalized.toUpperCase();
  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperQuery)) {
      throw new ValidationError(`Query contains disallowed keyword: ${keyword}`);
    }
  }
}

/**
 * Execute a read-only SELECT query with timeout and row limits
 */
export async function executeQuery(
  query: string,
  binds: any[] | Record<string, any> = [],
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  const maxRows = options.maxRows || config.MAX_ROWS_PER_QUERY;
  const timeout = options.timeout || config.QUERY_TIMEOUT_MS;
  const startTime = Date.now();

  let connection;

  try {
    // Validate query type
    validateSelectQuery(query);
    
    // Validate query length
    if (query.length > config.MAX_QUERY_LENGTH) {
      throw new ValidationError(
        `Query exceeds maximum length of ${config.MAX_QUERY_LENGTH} characters`
      );
    }

    // Get connection from pool
    connection = await getConnection();

    // Execute query with timeout wrapper
    const executePromise = connection.execute(query, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows,
      extendedMetaData: true,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Query timeout after ${timeout}ms`));
      }, timeout);
    });

    const result = await Promise.race([executePromise, timeoutPromise]);

    const executionTime = Date.now() - startTime;

    // Extract column names from metadata
    const columns = result.metaData?.map((col: { name: string }) => col.name) || [];

    const queryResult: QueryResult = {
      rows: (result.rows as Record<string, any>[]) || [],
      rowCount: result.rows?.length || 0,
      columns,
      executionTime,
    };

    // Audit log successful query
    audit('Query executed successfully', {
      query: query.substring(0, 500),
      rowCount: queryResult.rowCount,
      executionTime,
      hasBinds: Array.isArray(binds) ? binds.length > 0 : Object.keys(binds).length > 0,
    });

    logger.debug('Query executed', {
      rowCount: queryResult.rowCount,
      columns: columns.length,
      executionTime,
    });

    return queryResult;
    
  } catch (err: any) {
    const executionTime = Date.now() - startTime;

    // Handle timeout specially - attempt to cancel query
    if (err instanceof TimeoutError) {
      if (connection) {
        try {
          await connection.break(); // Cancel the running operation
          logger.warn('Cancelled timed-out query', { executionTime });
        } catch (breakErr) {
          logger.error('Failed to cancel timed-out query', { error: breakErr });
        }
      }
    }

    // Categorize error if not already categorized
    const categorized = err instanceof ValidationError || err instanceof TimeoutError
      ? err
      : categorizeOracleError(err);

    logger.error('Query execution failed', {
      errorType: categorized.name,
      errorCode: (categorized as any).code,
      query: query.substring(0, 200),
      executionTime,
    });

    audit('Query execution failed', {
      errorType: categorized.name,
      query: query.substring(0, 500),
      executionTime,
    });

    throw categorized;
    
  } finally {
    // Always release connection back to pool
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Error releasing connection', { error: err });
      }
    }
  }
}

/**
 * Get database schema information (SECURE VERSION)
 */
export async function getSchema(tableName?: string): Promise<QueryResult> {
  let query: string;
  let binds: Record<string, any> = {};

  if (tableName) {
    // Get columns for specific table - USE BIND PARAMETERS
    query = `
      SELECT 
        column_name,
        data_type,
        data_length,
        nullable
      FROM user_tab_columns
      WHERE table_name = UPPER(:tableName)
      ORDER BY column_id
    `;
    binds = { tableName };
  } else {
    // Get all accessible tables
    query = `
      SELECT 
        table_name,
        tablespace_name
      FROM user_tables
      ORDER BY table_name
    `;
  }

  return executeQuery(query, binds, { maxRows: 1000 });
}
```

---

## 8. Conclusion & Next Steps

### Summary

The Oracle MCP server is a **well-architected, functional implementation** that successfully bridges LLMs with Oracle databases. The codebase demonstrates good TypeScript practices, clean separation of concerns, and effective use of the MCP protocol.

However, **several critical security and robustness issues** must be addressed before production deployment:

1. ✅ **SQL injection vulnerability** in schema introspection
2. ✅ **Missing query timeout enforcement**
3. ✅ **No query type validation** (defense in depth)
4. ✅ **Insufficient error handling**
5. ✅ **Configuration security concerns**

### Recommended Immediate Actions

**Week 1 Priority:**
1. Fix SQL injection by using bind parameters
2. Implement query timeout enforcement
3. Add SELECT-only query validation
4. Improve error categorization and messages
5. Secure configuration (required credentials, no logging)

**Week 2-3 Priority:**
1. Add comprehensive test suite (Vitest + testcontainers)
2. Fix duplicate signal handlers
3. Set up CI/CD with automated testing
4. Achieve ≥70% code coverage

**Month 2+ Priorities:**
1. Replace custom logger with Pino
2. Add schema caching
3. Implement query streaming
4. Add query analytics and monitoring

### Long-Term Vision

This project has potential to evolve into an **enterprise-grade database MCP server** with:
- Multi-database support
- Advanced query optimization insights
- Comprehensive monitoring and analytics
- Rate limiting and resource quotas
- Authentication and authorization

### Final Recommendation

**Do NOT deploy to production** until Priority 1 items are completed. The SQL injection vulnerability alone is a blocker.

Once security issues are resolved and tests are in place, this will be an **excellent tool** for enabling LLM-powered database exploration and querying.

---

**Document Version:** 1.0  
**Last Updated:** October 2025
