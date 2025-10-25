# Oracle Database MCP Server & Client Plan

## Project Overview
Create an MCP (Model Context Protocol) server that integrates with GitHub Copilot to execute SQL queries against an Oracle database. This allows LLMs within Copilot to safely run read-only queries against your Oracle DB.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Copilot / LLM                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ (MCP Protocol)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ MCP Client (VS Code / Copilot Extension)                   │
│ - Communicates with MCP Server via STDIO                   │
│ - Spawns server process & pipes stdin/stdout/stderr        │
│ - Handles tool invocations                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ (JSON-RPC over STDIO)
                       │ stdin/stdout stream
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ MCP Server Process (Node.js + TypeScript)                  │
│ - Implements MCP protocol (stdio transport)                │
│ - Defines SQL execution tools                              │
│ - Handles query validation & execution                     │
│ - Manages error handling & response formatting             │
└──────────────────────┬──────────────────────────────────────┘
                       │ (oracledb package)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Oracle Database Client Library (oracledb)                  │
│ - Connection pooling                                       │
│ - Query execution with READ-ONLY user                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ (SQL over network - SELECT only)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Oracle Database (READ-ONLY USER)                           │
│ - Executes SELECT queries only                             │
│ - Returns result sets                                      │
│ - No DML operations possible at DB level                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core MCP Server Implementation
**Goal:** Build the MCP server with basic Oracle connectivity

#### 1.1 Dependencies & Setup
- [x] MCP SDK (`@modelcontextprotocol/sdk`)
- [ ] Oracle DB Client (`oracledb`)
- [ ] Environment variable management (`dotenv`)
- [ ] Input validation (`zod` - already included)
- [ ] Logging utility (`winston` or similar)
- [ ] Connection pooling manager

**Files to create:**
- `src/config.ts` - Configuration & environment variables
- `src/database/oracleConnection.ts` - Oracle DB connection management
- `src/server.ts` - Main MCP server implementation
- `.env.example` - Environment template
- `.gitignore` - Security (exclude .env, node_modules)

#### 1.2 Database Connection Layer
**Requirements:**
- Connection pooling for performance
- **READ-ONLY database user** (enforced at DB level for security)
- Connection string from environment variables
- Error handling & retry logic
- Connection timeout management
- Query timeout management
- Graceful shutdown of connection pool

**Setup:**
- DBA creates read-only user on Oracle DB
- User has SELECT privileges on allowed tables only
- User has NO INSERT, UPDATE, DELETE, CREATE, DROP privileges
- Connection string, user, and password stored in `.env`

**Interfaces to define:**
```typescript
interface OracleConfig {
  connectionString: string;
  user: string; // READ-ONLY user
  password: string;
  poolMin?: number;
  poolMax?: number;
  poolIncrement?: number;
  queryTimeout?: number;
}

interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  columns: string[];
}
```

---

### Phase 2: MCP Tools Definition
**Goal:** Define SQL execution tools with validation & safety

#### 2.1 Tool: `query_database`
- **Purpose:** Execute read-only SELECT queries
- **Input Schema (Zod):**
  - `query` (string): SQL SELECT statement
  - `maxRows` (number, optional): Limit results (default: 1000)
  - `timeout` (number, optional): Query timeout in ms

- **Validation Rules:**
  - Basic query length limit (e.g., 50,000 characters)
  - Enforce result size limits (prevent memory exhaustion)
  - Query timeout enforcement
  - No need for injection protection (local client, trusted)

- **Response Format:**
  ```typescript
  {
    success: boolean;
    data?: QueryResult;
    error?: string;
    executionTime: number; // milliseconds
  }
  ```

#### 2.2 Tool: `get_database_schema`
- **Purpose:** Retrieve database schema information
- **Input Schema:**
  - `tableName?` (string): Specific table or all tables
  - `includeColumns` (boolean, optional): Include column details

- **Returns:** Table names, column names, data types, constraints

#### 2.3 Tool: `validate_query`
- **Purpose:** Validate SQL syntax without executing
- **Input Schema:**
  - `query` (string): SQL to validate

- **Returns:** Validation result with any syntax errors

---

### Phase 3: Security & Validation
**Goal:** Ensure safe, efficient database access (local client only)

#### 3.1 Query Safety Layer
- [ ] Basic query validation
- [ ] Query complexity analysis (prevent expensive queries)
- [ ] Rate limiting & throttling
- [ ] Query result size limits (prevent memory exhaustion)
- [ ] Query timeout enforcement
- [ ] No injection protection needed (local trusted client)

#### 3.2 Logging & Auditing
- [ ] Log all executed queries with:
  - Timestamp
  - Query text (first 500 chars)
  - Execution time
  - Result row count
  - Success/failure status

- [ ] Implement structured logging (JSON format)
- [ ] Optional: Send logs to centralized system

#### 3.3 Error Handling
- [ ] Graceful error messages
- [ ] Connection error handling
- [ ] Timeout handling
- [ ] Resource limit handling

---

### Phase 4: Testing
**Goal:** Ensure reliability & security

#### 4.1 Unit Tests
- [ ] Query validation tests
- [ ] Connection pool tests
- [ ] Error handling scenarios
- [ ] Input sanitization tests

#### 4.2 Integration Tests
- [ ] Connect to test Oracle instance
- [ ] Execute sample queries
- [ ] Test schema retrieval
- [ ] Test error scenarios

#### 4.3 Reliability Tests
- [ ] Query timeout behavior
- [ ] Result size limit enforcement
- [ ] Connection pool exhaustion scenarios
- [ ] Error recovery

**Tools:** Jest, Mocha, or similar

---

### Phase 5: GitHub Copilot Integration
**Goal:** Connect the MCP server to GitHub Copilot via stdio

#### 5.1 VS Code Configuration
- [ ] Create `.vs-code/settings.json` or `cline_mcp_config.json` configuration
- [ ] Document MCP server setup in Copilot extensions
- [ ] Server communicates via **stdio (stdin/stdout)** not HTTP

**Configuration File (cline_mcp_config.json or VS Code settings):**
```json
{
  "mcpServers": {
    "oracle-db": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "ORACLE_CONNECTION_STRING": "${env:ORACLE_CONNECTION_STRING}",
        "ORACLE_USER": "${env:ORACLE_USER}",
        "ORACLE_PASSWORD": "${env:ORACLE_PASSWORD}",
        "ORACLE_POOL_MIN": "2",
        "ORACLE_POOL_MAX": "10"
      }
    }
  }
}
```

**How it works:**
1. Copilot extension spawns the Node.js server process
2. Server listens on stdin for JSON-RPC messages
3. Server writes JSON-RPC responses to stdout
4. stderr is used for logging/debugging
5. No HTTP server needed - purely process-based communication

#### 5.2 Documentation
- [ ] README with setup instructions
- [ ] Copilot prompt examples
- [ ] Troubleshooting guide
- [ ] How to setup read-only Oracle user

---

## Project File Structure

```
my-mcp/
├── src/
│   ├── server.ts                 # Main MCP server entry point
│   ├── config.ts                 # Configuration & validation
│   ├── database/
│   │   ├── oracleConnection.ts   # Oracle DB connection pool
│   │   ├── queryExecutor.ts      # Query execution logic
│   │   └── types.ts              # Database-related types
│   ├── tools/
│   │   ├── queryDatabase.ts      # query_database tool
│   │   ├── getSchema.ts          # get_database_schema tool
│   │   ├── validateQuery.ts      # validate_query tool
│   │   └── index.ts              # Tool registration
│   ├── security/
│   │   ├── queryValidator.ts     # Query safety checks
│   │   ├── sqlInjectionGuard.ts  # Injection prevention
│   │   └── rateLimiter.ts        # Rate limiting
│   ├── logging/
│   │   └── logger.ts             # Structured logging
│   └── utils/
│       ├── errorFormatter.ts     # Error response formatting
│       └── typeGuards.ts         # Type checking utilities
├── tests/
│   ├── unit/
│   │   ├── queryValidator.test.ts
│   │   ├── sqlInjectionGuard.test.ts
│   │   └── database.test.ts
│   └── integration/
│       └── server.test.ts
├── .env.example                  # Environment template
├── .env                          # Local env (git ignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── PLAN.md                       # This file
├── README.md                     # User documentation
└── dist/                         # Compiled output (git ignored)
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.2",
    "zod": "^3.25.76",
    "oracledb": "^6.4.0",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.5",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2"
  }
}
```

---

## Key Configuration Points

### Environment Variables (`.env`)
```
# Oracle Database Connection (READ-ONLY USER)
ORACLE_CONNECTION_STRING=hostname:port/servicename
ORACLE_USER=readonly_user
ORACLE_PASSWORD=readonly_password

# Connection Pool Settings
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10

# Query Settings
QUERY_TIMEOUT_MS=30000
MAX_ROWS_PER_QUERY=1000
MAX_QUERY_LENGTH=10000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/mcp-server.log

# Security
ENABLE_AUDIT_LOGGING=true
ALLOWED_TABLES=USERS,PRODUCTS,ORDERS  # Optional whitelist

# Transport
MCP_TRANSPORT=stdio  # Uses stdin/stdout for communication
```

---

## Implementation Checklist

- [ ] Phase 1: Core MCP Server
  - [ ] Setup TypeScript configuration
  - [ ] Implement database connection layer
  - [ ] Create main server entry point
  - [ ] Test basic MCP protocol handshake

- [ ] Phase 2: MCP Tools
  - [ ] Implement query_database tool
  - [ ] Implement get_database_schema tool
  - [ ] Implement validate_query tool
  - [ ] Add tool schemas with Zod validation

- [ ] Phase 3: Security
  - [ ] SQL injection prevention
  - [ ] Query validation layer
  - [ ] Logging & auditing
  - [ ] Error handling & sanitization

- [ ] Phase 4: Testing
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] Security tests

- [ ] Phase 5: Copilot Integration
  - [ ] Documentation
  - [ ] Configuration guide
  - [ ] Example prompts
  - [ ] Troubleshooting guide

---

## Security Considerations

### Local Client Architecture
- Designed for **trusted local environment** only
- No injection protection needed (local, trusted user)
- Read-only database user provides data protection layer
- Focus is on stability, performance, and preventing resource exhaustion

### Priority Safeguards
1. **Query Timeout** - Prevent long-running/expensive queries
2. **Result Size Limits** - Prevent memory exhaustion
3. **Connection Pooling** - Efficient resource management
4. **Rate Limiting** - Prevent query flooding
5. **Logging** - Track all activity for debugging/auditing
6. **Error Handling** - Graceful failure modes

---

## Success Criteria

✅ MCP server starts without errors
✅ Can execute SELECT queries successfully
✅ Blocks INSERT/UPDATE/DELETE/DROP operations
✅ Returns results in expected format
✅ Handles errors gracefully
✅ Logs all activity
✅ Integrates with GitHub Copilot
✅ Passes security tests
✅ All unit and integration tests pass

---

## Documentation

### Integration Guides
- ✅ [MCP Integration Guide](./docs/MCP-INTEGRATION.md) - Understanding MCP protocol and tools
- ✅ [VS Code Integration Guide](./docs/VSCODE-INTEGRATION.md) - Set up with GitHub Copilot
- ✅ [Claude Desktop Integration Guide](./docs/CLAUDE-INTEGRATION.md) - Set up with Claude Desktop

### Test Results
- ✅ [Test Results](./test-results.md) - Comprehensive test results with sample queries

## References

- MCP Documentation: https://modelcontextprotocol.io/
- Oracle Node.js Driver: https://node-oracledb.readthedocs.io/
- GitHub Copilot Extensions: https://docs.github.com/en/copilot
