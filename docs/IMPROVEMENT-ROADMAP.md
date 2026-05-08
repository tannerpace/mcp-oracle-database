# Oracle MCP Server - Improvement Roadmap

**Last Updated:** October 2025  
**Status:** Planning Phase

---

## Quick Reference

| Phase | Timeline | Priority | Status |
|-------|----------|----------|--------|
| Phase 1: Security Fixes | Week 1 | 🔴 Critical | Not Started |
| Phase 2: Testing & Quality | Week 2-3 | 🟡 High | Not Started |
| Phase 3: Performance | Week 4 | 🟢 Medium | Not Started |
| Phase 4: Enhanced Features | Month 2 | 🟢 Medium | Not Started |
| Phase 5: Enterprise | Month 3+ | 🔵 Low | Not Started |

---

## Phase 1: Critical Security Fixes ⚠️

**Timeline:** Week 1  
**Priority:** 🔴 CRITICAL - Do NOT deploy to production before completion

### 1.1 Fix SQL Injection Vulnerability

**Issue:** `getSchema()` uses string interpolation for table name parameter

**File:** `src/database/queryExecutor.ts:106`

**Action Items:**
- [ ] Refactor `getSchema()` to use bind parameters
- [ ] Update `executeQuery()` signature to accept bind parameters
- [ ] Test with malicious inputs
- [ ] Document bind parameter usage

**Code Change:**
```typescript
// BEFORE (Line 106)
WHERE table_name = UPPER('${tableName}')

// AFTER
WHERE table_name = UPPER(:tableName)
// And pass binds: { tableName }
```

**Validation:**
```bash
# Test with injection attempt
curl -X POST localhost:3000/tools/call \
  -d '{"name":"get_database_schema","arguments":{"tableName":"'; DROP TABLE users; --"}}'
# Should return 0 rows safely, not execute DROP
```

---

### 1.2 Implement Query Timeout

**Issue:** Timeout parameter accepted but not enforced

**File:** `src/database/queryExecutor.ts:14`

**Action Items:**
- [ ] Implement `Promise.race()` timeout wrapper
- [ ] Add `connection.break()` for timeout cancellation
- [ ] Update configuration validation
- [ ] Test with long-running queries

**Code Change:**
```typescript
// Add timeout wrapper around connection.execute()
const executePromise = connection.execute(query, binds, options);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new TimeoutError(...)), timeout)
);
const result = await Promise.race([executePromise, timeoutPromise]);
```

**Validation:**
```bash
# Test timeout with slow query
time node dist/client.js --query "SELECT * FROM all_objects" --timeout 1000
# Should timeout after ~1 second
```

---

### 1.3 Validate Query Type (SELECT-only)

**Issue:** No validation that queries are SELECT statements

**File:** `src/database/queryExecutor.ts` (new function)

**Action Items:**
- [ ] Create `validateSelectQuery()` function
- [ ] Check query starts with SELECT
- [ ] Blacklist dangerous keywords (INSERT, DELETE, DROP, etc.)
- [ ] Call validation before execution
- [ ] Add tests for validation logic

**Code Change:**
```typescript
function validateSelectQuery(query: string): void {
  const selectPattern = /^\s*(\/\*.*?\*\/)?\s*SELECT\s/i;
  if (!selectPattern.test(query)) {
    throw new ValidationError('Only SELECT queries are allowed');
  }
  // Check for dangerous keywords...
}
```

**Validation:**
```bash
# Test with non-SELECT query
npm run test-client -- --query "DROP TABLE users"
# Should reject with error, not attempt execution
```

---

### 1.4 Improve Error Handling

**Issue:** Generic error messages, no categorization, potential info leakage

**Files:**
- `src/database/errors.ts` (new)
- `src/database/queryExecutor.ts:63`

**Action Items:**
- [ ] Create custom error classes (QueryError, ConnectionError, etc.)
- [ ] Implement `categorizeOracleError()` function
- [ ] Update all error handling to use categorized errors
- [ ] Remove internal details from user-facing messages
- [ ] Add error type to audit logs

**Code Change:**
```typescript
// src/database/errors.ts (new file)
export class DatabaseError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message);
  }
}

export class QueryError extends DatabaseError { ... }
export class ConnectionError extends DatabaseError { ... }
export class ValidationError extends DatabaseError { ... }
export class TimeoutError extends DatabaseError { ... }

export function categorizeOracleError(err: any): DatabaseError {
  // Map Oracle error codes to error types
}
```

**Validation:**
- [ ] All errors have consistent structure
- [ ] No stack traces or internal details in responses
- [ ] Error types logged for debugging

---

### 1.5 Secure Configuration

**Issue:** Optional credentials, password logging, no validation

**Files:**
- `src/config.ts:7-9`
- `src/database/oracleConnection.ts:29`

**Action Items:**
- [ ] Make ORACLE_* credentials required (remove `.optional()`)
- [ ] Add min/max validation for pool and query settings
- [ ] Remove password from log output
- [ ] Redact username in logs
- [ ] Add cross-field validation (pool_min <= pool_max)

**Code Change:**
```typescript
// src/config.ts
ORACLE_CONNECTION_STRING: z.string().min(1, 'Connection string required'),
ORACLE_USER: z.string().min(1, 'User required'),
ORACLE_PASSWORD: z.string().min(1, 'Password required'),

// src/database/oracleConnection.ts
logger.info('Creating connection pool', {
  connectionString: poolConfig.connectionString,
  user: poolConfig.user.substring(0, 3) + '***', // Redacted
  // Never log password
});
```

**Validation:**
```bash
# Test without credentials
unset ORACLE_PASSWORD
npm start
# Should fail with clear error: "Password required"
```

---

### 1.6 Fix Duplicate Signal Handlers

**Issue:** SIGINT/SIGTERM handlers in both server.ts and oracleConnection.ts

**Files:**
- `src/server.ts:138-150`
- `src/database/oracleConnection.ts:74-84`

**Action Items:**
- [ ] Remove signal handlers from `oracleConnection.ts`
- [ ] Keep only in `server.ts` (application entry point)
- [ ] Ensure proper shutdown order (pool first, then server)
- [ ] Add uncaughtException and unhandledRejection handlers

**Code Change:**
```typescript
// src/database/oracleConnection.ts
// DELETE lines 74-84 (signal handlers)

// src/server.ts - Keep and enhance
process.on('SIGINT', async () => {
  await closePool();
  await server.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err });
  closePool().finally(() => process.exit(1));
});
```

**Validation:**
```bash
# Start server and send SIGTERM
npm start &
PID=$!
sleep 2
kill -TERM $PID
# Should log shutdown once, not twice
```

---

## Phase 2: Code Quality & Testing 🧪

**Timeline:** Week 2-3  
**Priority:** 🟡 HIGH

### 2.1 Add Comprehensive Test Suite

**Action Items:**
- [ ] Install Vitest and testcontainers
- [ ] Set up test configuration
- [ ] Write unit tests for:
  - Configuration validation
  - Query validation (SELECT-only)
  - Error categorization
  - Bind parameter handling
- [ ] Write integration tests for:
  - Connection pool lifecycle
  - Query execution (with Oracle container)
  - Schema introspection
  - Timeout behavior
  - Error scenarios
- [ ] Set up code coverage reporting
- [ ] Achieve ≥70% code coverage

**Files to Create:**
- `vitest.config.ts`
- `src/config.test.ts`
- `src/database/__tests__/queryExecutor.test.ts`
- `src/database/__tests__/oracleConnection.test.ts`
- `src/tools/__tests__/queryDatabase.test.ts`
- `src/tools/__tests__/getSchema.test.ts`

**Commands:**
```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8 testcontainers
npm run test
npm run test:coverage
```

**Success Criteria:**
- [ ] All tests pass
- [ ] ≥70% line coverage
- [ ] ≥60% branch coverage
- [ ] All critical paths tested

---

### 2.2 Set Up CI/CD Pipeline

**Action Items:**
- [ ] Create GitHub Actions workflow
- [ ] Run tests on every PR
- [ ] Run tests on push to main
- [ ] Generate and publish coverage report
- [ ] Add build status badge to README

**File to Create:**
`.github/workflows/test.yml`

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

**Success Criteria:**
- [ ] Tests run automatically on PR
- [ ] Failing tests block merge
- [ ] Coverage visible in PR comments

---

## Phase 3: Performance & Scalability ⚡

**Timeline:** Week 4  
**Priority:** 🟢 MEDIUM

### 3.1 Add Schema Caching

**Action Items:**
- [ ] Create `SchemaCache` class
- [ ] Cache table lists for 5 minutes
- [ ] Cache column metadata per table
- [ ] Add TTL configuration
- [ ] Add cache clear endpoint/command

**File to Create:**
`src/database/schemaCache.ts`

**Success Criteria:**
- [ ] Schema queries not repeated within TTL
- [ ] Cache hit logged at debug level
- [ ] Memory usage acceptable (< 10MB for typical schemas)

---

### 3.2 Replace Custom Logger

**Action Items:**
- [ ] Install Pino and pino-pretty
- [ ] Migrate logger.ts to use Pino
- [ ] Configure separate audit log file
- [ ] Add log rotation (pino-rotate)
- [ ] Update all log calls if needed

**Dependencies:**
```bash
npm install pino pino-pretty
```

**Success Criteria:**
- [ ] Structured JSON logs in production
- [ ] Pretty logs in development
- [ ] Log files rotate daily
- [ ] Performance improved (benchmark with ab/wrk)

---

### 3.3 Implement Query Result Streaming

**Action Items:**
- [ ] Create `streamQueryResults()` function using `queryStream()`
- [ ] Keep `executeQuery()` for buffered results (MCP tools)
- [ ] Document when to use streaming vs buffered
- [ ] Add streaming example to docs

**File to Update:**
`src/database/queryExecutor.ts`

**Success Criteria:**
- [ ] Large result sets don't cause OOM
- [ ] Memory usage stable during streaming
- [ ] Performance comparable to buffered for small results

---

### 3.4 Add Connection Pool Monitoring

**Action Items:**
- [ ] Create `checkDatabaseHealth()` function
- [ ] Return pool statistics (in use, available, etc.)
- [ ] Add periodic health check (every 60s)
- [ ] Log warnings if pool exhausted
- [ ] Add health check MCP tool (optional)

**File to Create:**
`src/database/healthCheck.ts`

**Success Criteria:**
- [ ] Health status logged periodically
- [ ] Pool exhaustion detected and logged
- [ ] Latency tracked and alerted if high

---

## Phase 4: Enhanced Features 🚀

**Timeline:** Month 2  
**Priority:** 🟢 MEDIUM

### 4.1 Query Execution Plan Analysis

**Action Items:**
- [ ] Create `explainQuery()` tool
- [ ] Execute `EXPLAIN PLAN FOR ...`
- [ ] Retrieve plan from `DBMS_XPLAN.DISPLAY()`
- [ ] Format plan output nicely
- [ ] Add to MCP tools list

**File to Create:**
`src/tools/explainQuery.ts`

**Success Criteria:**
- [ ] Users can analyze slow queries
- [ ] Execution plan formatted readably
- [ ] Integrated with MCP protocol

---

### 4.2 Query History & Analytics

**Action Items:**
- [ ] Create `QueryHistory` class
- [ ] Track all queries (success/failure, timing)
- [ ] Implement `getQueryStats()` function
- [ ] Add MCP tool to expose stats
- [ ] Add top 10 slowest queries

**File to Create:**
`src/database/queryHistory.ts`

**Success Criteria:**
- [ ] Query patterns tracked
- [ ] Statistics available via MCP tool
- [ ] Slow queries identified

---

### 4.3 Rate Limiting

**Action Items:**
- [ ] Create `RateLimiter` class
- [ ] Limit requests per minute
- [ ] Limit concurrent queries
- [ ] Make limits configurable
- [ ] Return 429 Too Many Requests

**File to Create:**
`src/middleware/rateLimiter.ts`

**Success Criteria:**
- [ ] Prevents query flooding
- [ ] Configurable limits
- [ ] Clear error messages

---

### 4.4 Improved Documentation

**Action Items:**
- [ ] Add API documentation (JSDoc → generated docs)
- [ ] Create deployment guide
- [ ] Add troubleshooting FAQ
- [ ] Document all configuration options
- [ ] Add architecture diagrams

**Files to Update:**
- `README.md` (reference to new docs)
- `docs/API.md` (new)
- `docs/DEPLOYMENT.md` (new)
- `docs/TROUBLESHOOTING.md` (new)

**Success Criteria:**
- [ ] All features documented
- [ ] Deployment steps clear
- [ ] Common issues addressed in FAQ

---

## Phase 5: Enterprise Features 🏢

**Timeline:** Month 3+  
**Priority:** 🔵 LOW

### 5.1 Multi-Database Support

**Action Items:**
- [ ] Update config schema for multiple databases
- [ ] Manage multiple connection pools
- [ ] Add `database` parameter to MCP tools
- [ ] Add database list/switch tool
- [ ] Update documentation

**Success Criteria:**
- [ ] Can query multiple Oracle instances
- [ ] Database switching easy
- [ ] Configuration clear

---

### 5.2 Authentication & Authorization

**Action Items:**
- [ ] Add user authentication (optional)
- [ ] Implement per-user database credentials
- [ ] Add role-based access control
- [ ] Log user actions for audit
- [ ] Add user session management

**Success Criteria:**
- [ ] Multi-user support
- [ ] Per-user permissions
- [ ] Audit trail includes user ID

---

### 5.3 Query Result Export

**Action Items:**
- [ ] Add CSV export
- [ ] Add JSON export
- [ ] Add Parquet export (optional)
- [ ] Stream exports for large results
- [ ] Add export MCP tool

**Success Criteria:**
- [ ] Results exportable in common formats
- [ ] Large exports don't cause OOM
- [ ] Export tool integrated with MCP

---

### 5.4 Advanced Monitoring

**Action Items:**
- [ ] Add Prometheus metrics endpoint
- [ ] Track query count, latency, errors
- [ ] Create Grafana dashboard template
- [ ] Add alerting rules
- [ ] Document monitoring setup

**Success Criteria:**
- [ ] Metrics available for scraping
- [ ] Dashboard visualizes key metrics
- [ ] Alerts configured for issues

---

## Progress Tracking

### Completion Checklist

**Phase 1: Security** (0/6 completed)
- [ ] SQL injection fixed
- [ ] Query timeout implemented
- [ ] Query validation added
- [ ] Error handling improved
- [ ] Configuration secured
- [ ] Signal handlers deduplicated

**Phase 2: Testing** (0/2 completed)
- [ ] Test suite added (≥70% coverage)
- [ ] CI/CD pipeline configured

**Phase 3: Performance** (0/4 completed)
- [ ] Schema caching implemented
- [ ] Logger replaced with Pino
- [ ] Query streaming added
- [ ] Health checks added

**Phase 4: Features** (0/4 completed)
- [ ] Execution plan analysis
- [ ] Query analytics
- [ ] Rate limiting
- [ ] Documentation improved

**Phase 5: Enterprise** (0/4 completed)
- [ ] Multi-database support
- [ ] Authentication/authorization
- [ ] Result export
- [ ] Advanced monitoring

### Overall Progress

```
Phase 1: [          ] 0%
Phase 2: [          ] 0%
Phase 3: [          ] 0%
Phase 4: [          ] 0%
Phase 5: [          ] 0%
```

**Total Progress: 0/20 items (0%)**

---

## Next Steps

1. **Review this roadmap** with team/stakeholders
2. **Prioritize Phase 1** - critical security fixes
3. **Create GitHub issues** for each item
4. **Assign owners** for each phase
5. **Set target dates** for each phase
6. **Begin Phase 1 implementation**

## Resources

- **Code Review:** `docs/CODE-REVIEW.md`
- **Current Docs:** `README.md`, `docs/`
- **Issue Tracker:** GitHub Issues
- **Discussion:** GitHub Discussions

---

**Document Version:** 1.0  
**Last Updated:** October 2025
