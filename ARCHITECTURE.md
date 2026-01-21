# Schema Discovery Tools - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LLM / GitHub Copilot                     │
│                 (Asks: "Show me customer orders")                │
└────────────────────────────┬────────────────────────────────────┘
                             │ MCP Protocol (JSON-RPC over stdio)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Server (Node.js)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Tool Registry                          │   │
│  │  • query_database                                        │   │
│  │  • get_database_schema (legacy)                          │   │
│  │  • listTables ⭐ NEW                                      │   │
│  │  • describeTable ⭐ NEW                                   │   │
│  │  • getTableRelations ⭐ NEW                               │   │
│  │  • getSampleValues ⭐ NEW                                 │   │
│  │  • suggestRelatedTables ⭐ NEW                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │              Schema Discovery Layer                      │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │         In-Memory LRU Cache (5-min TTL)            │ │   │
│  │  │  • listTables results                              │ │   │
│  │  │  • describeTable results                           │ │   │
│  │  │  • getTableRelations results                       │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                             │                             │   │
│  │  ┌──────────────────────────▼──────────────────────┐   │   │
│  │  │         Discovery Tool Implementation            │   │   │
│  │  │  • Zod validation                                │   │   │
│  │  │  • SQL injection prevention                      │   │   │
│  │  │  • Audit logging                                 │   │   │
│  │  │  • Error handling                                │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │         Connection Pool Manager                          │   │
│  │  • Min: 2 connections                                    │   │
│  │  • Max: 10 connections                                   │   │
│  │  • Timeout: 30s                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ oracledb (Thin Mode)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Oracle Database 21c+                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   System Views                            │   │
│  │  • USER_TABLES (table list, row counts)                  │   │
│  │  • USER_TAB_COLUMNS (column metadata)                    │   │
│  │  • USER_TAB_COMMENTS (table comments)                    │   │
│  │  • USER_COL_COMMENTS (column comments)                   │   │
│  │  • USER_CONSTRAINTS (constraints)                        │   │
│  │  • USER_CONS_COLUMNS (constraint columns)                │   │
│  │  • USER_TAB_STATISTICS (row counts)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                   User Tables                             │   │
│  │  • CUSTOMERS, ORDERS, ORDER_ITEMS, etc.                  │   │
│  │  • Read-Only Access                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Scenario: "Show me the top customers by order value"

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: LLM discovers available tables                          │
├─────────────────────────────────────────────────────────────────┤
│ MCP Request:                                                     │
│   listTables({ includeRowCounts: false })                      │
│                                                                  │
│ Cache Check: MISS → Execute Query                               │
│                                                                  │
│ SQL Query:                                                       │
│   SELECT table_name, tablespace_name, comments                 │
│   FROM user_tables                                              │
│   ORDER BY table_name                                           │
│                                                                  │
│ Result: [CUSTOMERS, ORDERS, ORDER_ITEMS, ...]                  │
│ Cache: STORED (key: listTables:false)                          │
└─────────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: LLM examines CUSTOMERS structure                        │
├─────────────────────────────────────────────────────────────────┤
│ MCP Request:                                                     │
│   describeTable({ tableName: 'CUSTOMERS' })                    │
│                                                                  │
│ Cache Check: MISS → Execute Queries (2 queries)                │
│                                                                  │
│ SQL Query 1 (Columns):                                          │
│   SELECT column_name, data_type, nullable, ...                 │
│   FROM user_tab_columns                                         │
│   WHERE table_name = 'CUSTOMERS'                               │
│                                                                  │
│ SQL Query 2 (Constraints):                                      │
│   SELECT constraint_name, constraint_type, ...                 │
│   FROM user_constraints                                         │
│   WHERE table_name = 'CUSTOMERS'                               │
│                                                                  │
│ Result: {columns: [...], constraints: [...]}                   │
│ Cache: STORED (key: describeTable:CUSTOMERS:true)              │
└─────────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: LLM examines ORDERS structure                           │
├─────────────────────────────────────────────────────────────────┤
│ MCP Request:                                                     │
│   describeTable({ tableName: 'ORDERS' })                       │
│                                                                  │
│ [Same process as Step 2]                                        │
│                                                                  │
│ Result: Finds TOTAL_AMOUNT column                              │
└─────────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: LLM checks relationships                                │
├─────────────────────────────────────────────────────────────────┤
│ MCP Request:                                                     │
│   getTableRelations({ tableName: 'ORDERS' })                   │
│                                                                  │
│ Cache Check: MISS → Execute Queries (2 queries)                │
│                                                                  │
│ SQL Query 1 (Foreign Keys):                                     │
│   SELECT constraint_name, from_table, from_columns,            │
│          to_table, to_columns                                  │
│   FROM user_constraints + user_cons_columns                    │
│   WHERE table_name = 'ORDERS'                                  │
│                                                                  │
│ SQL Query 2 (Referenced By):                                    │
│   [Similar query for incoming FKs]                             │
│                                                                  │
│ Result:                                                          │
│   foreignKeys: [                                                │
│     {from: ORDERS.CUSTOMER_ID → to: CUSTOMERS.CUSTOMER_ID}    │
│   ]                                                             │
│   referencedBy: [                                               │
│     {from: ORDER_ITEMS.ORDER_ID → to: ORDERS.ORDER_ID}        │
│   ]                                                             │
│                                                                  │
│ Cache: STORED (key: tableRelations:ORDERS)                     │
└─────────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: LLM executes informed query                             │
├─────────────────────────────────────────────────────────────────┤
│ MCP Request:                                                     │
│   query_database({                                              │
│     query: "                                                    │
│       SELECT c.customer_name,                                  │
│              SUM(o.total_amount) as total_value                │
│       FROM customers c                                          │
│       JOIN orders o ON c.customer_id = o.customer_id           │
│       GROUP BY c.customer_id, c.customer_name                  │
│       ORDER BY total_value DESC                                │
│       FETCH FIRST 10 ROWS ONLY                                 │
│     "                                                           │
│   })                                                            │
│                                                                  │
│ No Cache (query execution)                                      │
│                                                                  │
│ Result: Top 10 customers with order values                     │
└─────────────────────────────────────────────────────────────────┘
```

## Cache Behavior

### First Request
```
Request → Cache MISS → Query DB → Return Result → Store in Cache
Time: ~100-500ms (depends on query complexity)
```

### Second Request (within 5 minutes)
```
Request → Cache HIT → Return Cached Result
Time: <1ms (instant)
```

### After 5 Minutes
```
Request → Cache MISS (expired) → Query DB → Return Result → Store in Cache
Time: ~100-500ms
```

### Cache Eviction (LRU)
```
Cache Full (100 entries) → Remove Least Recently Used → Add New Entry
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Input Validation (Zod)                                 │
│  • Validates all tool parameters                                │
│  • Type checking                                                │
│  • Required field enforcement                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: SQL Injection Prevention                               │
│  • Identifier validation (Oracle naming rules)                  │
│  • Parameterized queries where possible                         │
│  • Column names validated against system catalog                │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Query Safety Limits                                    │
│  • Row limits (FETCH FIRST n ROWS ONLY)                         │
│  • Timeout enforcement                                          │
│  • Connection pool limits                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Database Permissions                                   │
│  • Read-only user                                               │
│  • SELECT-only privileges                                       │
│  • No DDL/DML permissions                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Audit Logging                                          │
│  • All queries logged                                           │
│  • Execution times recorded                                     │
│  • Error tracking                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Optimization

### Query Optimization
- ✅ Use Oracle system views (pre-indexed)
- ✅ FETCH FIRST n ROWS for limits
- ✅ Avoid COUNT(*) on large tables (use statistics)
- ✅ Batch related queries when possible

### Caching Strategy
- ✅ Cache schema metadata (changes infrequently)
- ✅ Don't cache sample data (changes frequently)
- ✅ LRU eviction (most useful data stays)
- ✅ 5-minute TTL (balance freshness vs performance)

### Connection Management
- ✅ Connection pooling (reuse connections)
- ✅ Thin Mode (no Oracle Client needed)
- ✅ Automatic connection release
- ✅ Graceful shutdown handling

## Error Propagation

```
Error Occurs in DB Query
         ▼
Caught in Tool Implementation
         ▼
Logged with Context (logger.error)
         ▼
Audit Log Entry Created
         ▼
Return Error Response to LLM
{
  "success": false,
  "error": "Detailed error message"
}
         ▼
LLM Receives Error
         ▼
LLM Can Retry or Ask User for Clarification
```

## Benefits Summary

### For LLMs
✅ Accurate schema understanding
✅ No guessing table/column names
✅ Proper JOIN syntax from FK relationships
✅ Data format knowledge from samples
✅ Fast responses from caching

### For Users
✅ Better query accuracy
✅ Fewer errors and retries
✅ Faster interactions (cache)
✅ More intelligent suggestions
✅ Complete audit trail

### For System
✅ Reduced database load (cache)
✅ Controlled resource usage (limits)
✅ Security (read-only, validation)
✅ Observability (logging)
✅ Scalability (connection pooling)
