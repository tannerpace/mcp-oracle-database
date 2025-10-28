# Schema Discovery Tools - Quick Reference

## At a Glance

5 specialized tools for comprehensive Oracle database schema introspection:

| Tool | Purpose | Speed | Cache |
|------|---------|-------|-------|
| **listTables** | Discover all tables | Fast | ✅ |
| **describeTable** | Column metadata & constraints | Fast | ✅ |
| **getTableRelations** | Foreign key relationships | Fast | ✅ |
| **getSampleValues** | Sample data patterns | Medium | ❌ |
| **suggestRelatedTables** | Find related tables | Medium | ❌ |

## Quick Start

### 1️⃣ Discover Tables

```javascript
// Fast mode (no row counts)
listTables({ includeRowCounts: false })

// With row counts (slower but informative)
listTables({ includeRowCounts: true })
```

**Returns:** Table names, row counts, last modified, comments

---

### 2️⃣ Understand Table Structure

```javascript
describeTable({ 
  tableName: 'CUSTOMERS',
  includeConstraints: true 
})
```

**Returns:** Columns (type, nullable, length), constraints (PK, FK, unique)

---

### 3️⃣ Find Relationships

```javascript
getTableRelations({ tableName: 'ORDERS' })
```

**Returns:** Foreign keys (outgoing), references (incoming)

---

### 4️⃣ Get Sample Data

```javascript
getSampleValues({ 
  tableName: 'CUSTOMERS',
  sampleSize: 3 
})
```

**Returns:** Sample values, distinct counts, null counts

---

### 5️⃣ Suggest Related Tables

```javascript
suggestRelatedTables({ 
  tableName: 'ORDERS',
  maxSuggestions: 10 
})
```

**Returns:** Related tables with confidence scores

---

## LLM Workflow Example

**User:** "Show me the top customers by order value"

**LLM steps:**

```javascript
// Step 1: Discover available tables
const tables = await listTables({ includeRowCounts: false })
// → Finds: CUSTOMERS, ORDERS, ORDER_ITEMS

// Step 2: Understand ORDERS table
const orders = await describeTable({ tableName: 'ORDERS' })
// → Columns: ORDER_ID, CUSTOMER_ID, TOTAL_AMOUNT, ORDER_DATE

// Step 3: Check relationships
const relations = await getTableRelations({ tableName: 'ORDERS' })
// → FK: ORDERS.CUSTOMER_ID → CUSTOMERS.CUSTOMER_ID

// Step 4: Execute query
const result = await query_database({
  query: `
    SELECT c.customer_name, SUM(o.total_amount) as total_value
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.customer_name
    ORDER BY total_value DESC
    FETCH FIRST 10 ROWS ONLY
  `
})
```

---

## Safety Features

🔒 **All tools enforce strict limits:**
- Row limits: 3-10 for samples, 1000 for metadata
- SQL injection prevention: Identifier validation
- Query timeouts: Global timeout respected
- Read-only access: Uses read-only database user

📊 **All operations are logged:**
- Tool name and parameters
- Execution time
- Success/failure status
- Error details (if any)

---

## Caching

**Cached tools** (5-minute TTL):
- ✅ listTables
- ✅ describeTable  
- ✅ getTableRelations

**Not cached** (data changes frequently):
- ❌ getSampleValues
- ❌ suggestRelatedTables

**Cache invalidation:** Automatic after 5 minutes or server restart

---

## Performance Tips

✅ **Do:**
- Use `includeRowCounts: false` for fast table discovery
- Call discovery tools before complex queries
- Let the cache warm up (first call slower)

❌ **Don't:**
- Sample all columns on large tables (use `columnNames` filter)
- Request row counts unnecessarily
- Skip discovery tools and guess schema

---

## Common Patterns

### Pattern 1: Full Table Discovery
```javascript
// 1. Find all tables
const tables = await listTables({ includeRowCounts: true })

// 2. For each interesting table
for (const table of tables.data) {
  const details = await describeTable({ tableName: table.tableName })
  const relations = await getTableRelations({ tableName: table.tableName })
  // ... analyze structure
}
```

### Pattern 2: Relationship Mapping
```javascript
// Start with a known table
const mainTable = 'ORDERS'

// Get direct relationships
const relations = await getTableRelations({ tableName: mainTable })

// Suggest indirect relationships
const suggestions = await suggestRelatedTables({ tableName: mainTable })

// Build comprehensive table graph
// ...
```

### Pattern 3: Data Format Discovery
```javascript
// 1. Get table structure
const structure = await describeTable({ tableName: 'CUSTOMERS' })

// 2. Get sample data for all columns
const samples = await getSampleValues({ 
  tableName: 'CUSTOMERS',
  sampleSize: 5 
})

// 3. Understand data formats
// → EMAIL: varchar2, samples: ['john@example.com', ...]
// → CREATED_DATE: date, samples: ['2024-01-15', ...]
```

---

## Error Handling

All tools return consistent error format:

```json
{
  "success": false,
  "error": "Table INVALID_TABLE not found or not accessible"
}
```

**Common errors:**
- Table not found
- Invalid table/column name
- Permission denied
- Database connection timeout

---

## Testing

```bash
# Build the project
npm run build

# Run discovery tool tests
npm run test-discovery
```

**Note:** Tests require Oracle database connection.

---

## Documentation Links

📚 **Detailed Guides:**
- [Complete Tool Reference](./docs/SCHEMA-DISCOVERY.md)
- [MCP Message Examples](./docs/SCHEMA-DISCOVERY-EXAMPLES.md)
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md)

📖 **Main Documentation:**
- [README](./README.md)
- [MCP Integration](./docs/MCP-INTEGRATION.md)

---

## Support

**Issues?** Check:
1. Database connection is active
2. Read-only user has SELECT privileges
3. Tables exist in current schema
4. Oracle statistics are up-to-date (for row counts)

**Still stuck?** See [Troubleshooting](./README.md#troubleshooting)
