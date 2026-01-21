# Schema Discovery Tools

Advanced schema introspection tools for the Oracle MCP Server. These tools help LLMs understand database structure before executing queries.

## Overview

The schema discovery tools provide comprehensive database metadata in LLM-friendly JSON format:

- **listTables** - Get all accessible tables with metadata
- **describeTable** - Get detailed column information and constraints
- **getTableRelations** - Discover foreign key relationships
- **getSampleValues** - Retrieve sample data from tables
- **suggestRelatedTables** - Find related tables by various heuristics

All tools include **in-memory LRU caching** (5-minute TTL) for fast repeated access.

## Tools

### 1. listTables

Get a summary of all accessible tables with optional row counts and modification timestamps.

**Parameters:**
- `includeRowCounts` (boolean, optional): Include approximate row counts (slower but informative)

**Example:**
```javascript
{
  name: 'listTables',
  arguments: {
    includeRowCounts: true
  }
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": [
    {
      "tableName": "CUSTOMERS",
      "rowCount": 15234,
      "lastModified": "2024-01-15 10:30:00",
      "tablespace": "USERS",
      "comments": "Customer master data"
    }
  ]
}
```

---

### 2. describeTable

Get detailed column-level metadata for a specific table including constraints.

**Parameters:**
- `tableName` (string, required): Name of the table to describe
- `includeConstraints` (boolean, optional, default: true): Include constraint information

**Example:**
```javascript
{
  name: 'describeTable',
  arguments: {
    tableName: 'CUSTOMERS',
    includeConstraints: true
  }
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "tableName": "CUSTOMERS",
    "columns": [
      {
        "columnName": "CUSTOMER_ID",
        "dataType": "NUMBER",
        "nullable": false,
        "dataPrecision": 10,
        "comments": "Unique customer identifier"
      }
    ],
    "constraints": [
      {
        "constraintName": "CUSTOMERS_PK",
        "constraintType": "PRIMARY_KEY",
        "columns": ["CUSTOMER_ID"]
      },
      {
        "constraintName": "ORDERS_CUSTOMER_FK",
        "constraintType": "FOREIGN_KEY",
        "columns": ["CUSTOMER_ID"],
        "refTableName": "CUSTOMERS",
        "refColumns": ["CUSTOMER_ID"]
      }
    ]
  }
}
```

**Constraint Types:**
- `PRIMARY_KEY` - Primary key constraint
- `FOREIGN_KEY` - Foreign key constraint (includes refTableName and refColumns)
- `UNIQUE` - Unique constraint
- `CHECK` - Check constraint (includes searchCondition)

---

### 3. getTableRelations

Get foreign key relationships for a table in easily parseable JSON format.

**Parameters:**
- `tableName` (string, required): Name of the table to get relationships for

**Example:**
```javascript
{
  name: 'getTableRelations',
  arguments: {
    tableName: 'ORDERS'
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tableName": "ORDERS",
    "foreignKeys": [
      {
        "constraintName": "ORDERS_CUSTOMER_FK",
        "fromTable": "ORDERS",
        "fromColumns": ["CUSTOMER_ID"],
        "toTable": "CUSTOMERS",
        "toColumns": ["CUSTOMER_ID"],
        "deleteRule": "NO ACTION"
      }
    ],
    "referencedBy": [
      {
        "constraintName": "ORDER_ITEMS_ORDER_FK",
        "fromTable": "ORDER_ITEMS",
        "fromColumns": ["ORDER_ID"],
        "toTable": "ORDERS",
        "toColumns": ["ORDER_ID"],
        "deleteRule": "CASCADE"
      }
    ]
  }
}
```

**Delete Rules:**
- `NO ACTION` - No action on delete
- `CASCADE` - Cascade delete
- `SET NULL` - Set to NULL on delete

---

### 4. getSampleValues

Get sample values from table columns to understand data patterns.

**SAFETY:** Strictly limited to max 10 rows per column.

**Parameters:**
- `tableName` (string, required): Name of the table to sample
- `columnNames` (array of strings, optional): Specific columns to sample (if omitted, samples all)
- `sampleSize` (number, optional, 1-10, default: 3): Number of sample rows per column

**Example:**
```javascript
{
  name: 'getSampleValues',
  arguments: {
    tableName: 'CUSTOMERS',
    sampleSize: 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "columnName": "CUSTOMER_ID",
      "sampleValues": [1001, 1002, 1003],
      "distinctCount": 15234,
      "nullCount": 0
    },
    {
      "columnName": "EMAIL",
      "sampleValues": ["john@example.com", "jane@example.com", "bob@example.com"],
      "distinctCount": 15100,
      "nullCount": 134
    }
  ]
}
```

---

### 5. suggestRelatedTables

Suggest tables that may be related based on foreign keys, naming patterns, or shared columns.

**Parameters:**
- `tableName` (string, required): Name of the table to find related tables for
- `maxSuggestions` (number, optional, 1-20, default: 10): Maximum suggestions to return

**Example:**
```javascript
{
  name: 'suggestRelatedTables',
  arguments: {
    tableName: 'ORDERS',
    maxSuggestions: 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tableName": "CUSTOMERS",
      "relationshipType": "foreign_key",
      "confidence": 1.0,
      "description": "Foreign key relationship via ORDERS_CUSTOMER_FK"
    },
    {
      "tableName": "ORDER_ITEMS",
      "relationshipType": "naming_pattern",
      "confidence": 0.7,
      "description": "Similar naming pattern (base: ORDER)"
    },
    {
      "tableName": "PAYMENTS",
      "relationshipType": "shared_columns",
      "confidence": 0.6,
      "description": "Shares 2 column name(s)"
    }
  ]
}
```

**Relationship Types:**
- `foreign_key` - Connected by foreign key (confidence: 1.0)
- `naming_pattern` - Similar table names (confidence: 0.7)
- `shared_columns` - Share column names (confidence: 0.5-0.9)

---

## Caching

All discovery tools use an in-memory LRU cache:

- **TTL**: 5 minutes
- **Max Size**: 100 entries
- **Eviction**: Least Recently Used (LRU)

Cached responses include `"cached": true` in the result.

**Benefits:**
- Fast repeated queries
- Reduced database load
- Consistent snapshots during a session

**Cache Keys:**
- `listTables:{includeRowCounts}` - Per includeRowCounts setting
- `describeTable:{tableName}:{includeConstraints}` - Per table and constraints setting
- `tableRelations:{tableName}` - Per table

---

## Safety Features

1. **Strict Row Limits**: All discovery queries limit results (1000 for metadata, 10 for samples)
2. **Query Timeouts**: All queries respect the global timeout setting
3. **Error Handling**: Graceful error messages on failure
4. **Audit Logging**: All tool calls logged with execution time
5. **Read-Only**: Uses read-only database user

---

## Performance

**Fast Queries:**
- `listTables` (without counts): ~50ms
- `describeTable`: ~100ms
- `getTableRelations`: ~150ms

**Slower Queries:**
- `listTables` (with counts): ~500ms (depends on table statistics)
- `getSampleValues`: ~200ms per column

**Optimization Tips:**
- Use `includeRowCounts: false` for fast table listing
- Cache hit: <1ms (instant from memory)
- Keep statistics up-to-date for accurate row counts

---

## Testing

Run the discovery test client:

```bash
npm run test-discovery
```

This will test all 5 discovery tools plus caching behavior.

---

## Integration Example

Typical LLM workflow:

```
User: "Show me the top 10 customers by order value"

LLM:
1. listTables() → Discover CUSTOMERS and ORDERS tables
2. describeTable('CUSTOMERS') → Understand structure
3. describeTable('ORDERS') → Understand structure
4. getTableRelations('ORDERS') → Find FK to CUSTOMERS
5. query_database(
     "SELECT c.customer_name, SUM(o.total_amount) as value
      FROM customers c
      JOIN orders o ON c.customer_id = o.customer_id
      GROUP BY c.customer_id, c.customer_name
      ORDER BY value DESC
      FETCH FIRST 10 ROWS ONLY"
   )
```

---

## See Also

- [MCP Message Examples](./SCHEMA-DISCOVERY-EXAMPLES.md) - Detailed MCP protocol examples
- [Main README](../README.md) - General MCP server documentation
- [MCP Integration Guide](./MCP-INTEGRATION.md) - MCP protocol details
