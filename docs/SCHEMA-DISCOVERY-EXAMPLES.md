# Schema Discovery Tools - MCP Message Examples

This document demonstrates how an LLM would use the new schema discovery tools through the MCP protocol before executing queries.

## Typical Workflow

### 1. Discover Available Tables

**User asks:** "What tables are available in the database?"

**LLM calls:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "listTables",
    "arguments": {
      "includeRowCounts": true
    }
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
    },
    {
      "tableName": "ORDERS",
      "rowCount": 45678,
      "lastModified": "2024-01-20 14:22:00",
      "tablespace": "USERS",
      "comments": "Order transaction records"
    },
    {
      "tableName": "ORDER_ITEMS",
      "rowCount": 123456,
      "lastModified": "2024-01-20 14:22:05",
      "tablespace": "USERS"
    }
  ]
}
```

---

### 2. Understand Table Structure

**User asks:** "Show me the structure of the CUSTOMERS table"

**LLM calls:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "describeTable",
    "arguments": {
      "tableName": "CUSTOMERS",
      "includeConstraints": true
    }
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
      },
      {
        "columnName": "CUSTOMER_NAME",
        "dataType": "VARCHAR2",
        "nullable": false,
        "dataLength": 100,
        "comments": "Customer full name"
      },
      {
        "columnName": "EMAIL",
        "dataType": "VARCHAR2",
        "nullable": true,
        "dataLength": 255
      },
      {
        "columnName": "CREATED_DATE",
        "dataType": "DATE",
        "nullable": false,
        "defaultValue": "SYSDATE"
      }
    ],
    "constraints": [
      {
        "constraintName": "CUSTOMERS_PK",
        "constraintType": "PRIMARY_KEY",
        "columns": ["CUSTOMER_ID"]
      },
      {
        "constraintName": "CUSTOMERS_EMAIL_UK",
        "constraintType": "UNIQUE",
        "columns": ["EMAIL"]
      }
    ]
  }
}
```

---

### 3. Discover Table Relationships

**User asks:** "What tables are related to ORDERS?"

**LLM first calls:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "getTableRelations",
    "arguments": {
      "tableName": "ORDERS"
    }
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

**LLM can then suggest related tables:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "suggestRelatedTables",
    "arguments": {
      "tableName": "ORDERS",
      "maxSuggestions": 10
    }
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
      "relationshipType": "foreign_key",
      "confidence": 1.0,
      "description": "Foreign key relationship via ORDER_ITEMS_ORDER_FK"
    },
    {
      "tableName": "ORDER_HISTORY",
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

---

### 4. Understand Data Patterns

**User asks:** "Show me some example customer data"

**LLM calls:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "getSampleValues",
    "arguments": {
      "tableName": "CUSTOMERS",
      "sampleSize": 3
    }
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
      "columnName": "CUSTOMER_NAME",
      "sampleValues": ["John Doe", "Jane Smith", "Bob Johnson"],
      "distinctCount": 15234,
      "nullCount": 0
    },
    {
      "columnName": "EMAIL",
      "sampleValues": ["john@example.com", "jane@example.com", "bob@example.com"],
      "distinctCount": 15100,
      "nullCount": 134
    },
    {
      "columnName": "CREATED_DATE",
      "sampleValues": ["2023-01-15", "2023-02-20", "2023-03-10"],
      "distinctCount": 890,
      "nullCount": 0
    }
  ]
}
```

---

### 5. Complex Query Example

**User asks:** "Show me the top 10 customers by total order value"

**LLM workflow:**

1. **Discover tables** (listTables)
2. **Understand CUSTOMERS structure** (describeTable for CUSTOMERS)
3. **Understand ORDERS structure** (describeTable for ORDERS)
4. **Check relationships** (getTableRelations for ORDERS)
5. **Get sample data** to understand data formats (getSampleValues)
6. **Execute query** with proper JOINs:

```json
{
  "method": "tools/call",
  "params": {
    "name": "query_database",
    "arguments": {
      "query": "SELECT c.customer_name, c.email, SUM(o.total_amount) as total_value FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.customer_name, c.email ORDER BY total_value DESC FETCH FIRST 10 ROWS ONLY",
      "maxRows": 10
    }
  }
}
```

---

## Benefits for LLMs

1. **Accurate Schema Discovery**: No guessing table/column names
2. **Relationship Understanding**: Proper JOINs based on foreign keys
3. **Data Format Knowledge**: Sample values help format queries correctly
4. **Performance**: Cached results speed up repeated queries
5. **Safety**: All discovery queries have strict row limits

---

## Caching Behavior

Subsequent calls to the same discovery tool with the same parameters return cached results:

**First call:**
```json
{
  "success": true,
  "cached": false,
  "data": [...]
}
```

**Second call (within 5 minutes):**
```json
{
  "success": true,
  "cached": true,
  "data": [...] // Same data, but returned instantly from cache
}
```

Cache TTL: 5 minutes
Cache Size: 100 entries (LRU eviction)
