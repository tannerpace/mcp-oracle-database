# SQL Injection Fix: `get_database_schema` Tool

## Overview

The `get_database_schema` MCP tool is vulnerable to a UNION-based SQL injection attack via its `tableName` argument (CWE-89 / CWE-943). The `tableName` value is accepted as a raw `z.string()` and interpolated directly into a single-quoted SQL literal with no escaping, binding, or identifier validation. An attacker — or a model operating under prompt injection — can close the literal, append an arbitrary `UNION SELECT`, and read any table or view accessible to the configured Oracle account.

The project already contains both the correct fix pattern (identifier validation in `getSampleValues.ts`) and the infrastructure for the gold-standard fix (parameterized queries via `oracledb`), but neither is applied on the vulnerable path.

---

## Root Cause

### Vulnerable sink — `src/database/queryExecutor.ts`, `getSchema()`

```typescript
// VULNERABLE: tableName is concatenated directly into a SQL literal
query = `
  SELECT column_name, data_type, data_length, nullable
  FROM user_tab_columns
  WHERE table_name = UPPER('${tableName}')   // ← raw interpolation
  ORDER BY column_id
`;

return executeQuery(query, { maxRows: 1000 }); // binds hardcoded to []
```

`executeQuery()` calls `connection.execute(query, [], ...)` — the empty bind array `[]` confirms nothing is parameterized; the injection payload is baked into the query string.

### Missed validation — `src/tools/getSchema.ts`, `getDatabaseSchema()`

```typescript
// Only a z.string() type check — no content validation
export const GetSchemaSchema = z.object({
  tableName: z.string().optional(),
});

export async function getDatabaseSchema(input: GetSchemaInput = {}) {
  const validated = GetSchemaSchema.parse(input);
  // validated.tableName flows straight to getSchema() with no further checks
  const result = await getSchema(validated.tableName);
  ...
}
```

### Fix pattern that exists but is not applied — `src/tools/discovery/getSampleValues.ts`

```typescript
// This validator exists in the codebase but is scoped to getSampleValues only
function validateOracleIdentifier(identifier: string): boolean {
  const pattern = /^[A-Z][A-Z0-9_$#]{0,29}$/;
  return pattern.test(identifier);
}
```

### Why `ENFORCE_READ_ONLY_QUERIES` does not protect this path

The read-only guard checks that the final statement starts with `SELECT`. A `UNION SELECT` payload produces a statement that still starts with `SELECT`, so it passes the check cleanly.

---

## Requirements

1. **Primary fix — parameterized query**: `getSchema()` must pass `tableName` as an Oracle bind variable (`:tableName`), not as an interpolated string literal. This is the canonical CWE-89 remediation.
2. **`executeQuery()` bind support**: The `executeQuery()` helper currently hardcodes `binds = []`. It must accept an optional `binds` parameter so `getSchema()` can leverage it without bypassing the shared audit/timeout infrastructure.
3. **Defense-in-depth — identifier validation**: `getDatabaseSchema()` in `getSchema.ts` must validate `tableName` against the Oracle identifier regex before passing it to the database layer. This catches malformed input early and produces a clear error rather than a DB exception.
4. **Shared validator utility**: `validateOracleIdentifier()` must be extracted from `getSampleValues.ts` into a shared utility (`src/utils/validation.ts`) so both `getSchema.ts` and `getSampleValues.ts` use the same implementation.
5. **Zod schema refinement**: `GetSchemaSchema.tableName` must be tightened with a `.refine()` using the extracted validator, so invalid identifiers are rejected at the MCP input boundary before any downstream logic runs.
6. **Test coverage**: Add tests that confirm (a) the injection payload produces an error instead of being executed, and (b) valid table names continue to work. Tests must run without a live database (stub `oracledb`).

---

## Implementation Steps

### Step 1 — Extract `validateOracleIdentifier` to a shared utility

**File**: `src/utils/validation.ts` (new file)

- Move the `validateOracleIdentifier` function from `src/tools/discovery/getSampleValues.ts` to `src/utils/validation.ts`.
- Export it as a named export.
- Update `getSampleValues.ts` to import from `../../utils/validation.js` and remove its local copy.
- The regex stays unchanged: `/^[A-Z][A-Z0-9_$#]{0,29}$/`.

### Step 2 — Add optional `binds` parameter to `executeQuery()`

**File**: `src/database/queryExecutor.ts`

- Extend the `options` parameter of `executeQuery()` to accept an optional `binds` field:

  ```typescript
  options: { maxRows?: number; timeout?: number; binds?: oracledb.BindParameters }
  ```

- Inside the function, replace the hardcoded `[]` with `options.binds ?? []`:

  ```typescript
  const result = await connection.execute(query, options.binds ?? [], { ... });
  ```

- No other callers are affected because the parameter is optional and defaults to `[]`.

### Step 3 — Fix the injection in `getSchema()`

**File**: `src/database/queryExecutor.ts`, `getSchema()` function

- Replace the interpolated WHERE clause with a bind variable:

  ```typescript
  // BEFORE (vulnerable)
  WHERE table_name = UPPER('${tableName}')

  // AFTER (safe)
  WHERE table_name = UPPER(:tableName)
  ```

- Pass the bind value via the new `binds` option:

  ```typescript
  return executeQuery(query, { maxRows: 1000, binds: { tableName } });
  ```

- The `UPPER()` call remains; Oracle evaluates it on the safely-bound value.

### Step 4 — Add identifier validation in `getDatabaseSchema()`

**File**: `src/tools/getSchema.ts`

- Import `validateOracleIdentifier` from `../utils/validation.js`.
- Add a Zod `.refine()` to `GetSchemaSchema.tableName`:

  ```typescript
  tableName: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || validateOracleIdentifier(val.toUpperCase()),
      { message: 'tableName must be a valid Oracle identifier (letters, digits, _, $, # only; max 30 chars)' }
    ),
  ```

- Inside `getDatabaseSchema()`, add an explicit guard after `GetSchemaSchema.parse()` as defense-in-depth (covers any future code path that bypasses the Zod schema):

  ```typescript
  if (validated.tableName && !validateOracleIdentifier(validated.tableName.toUpperCase())) {
    return {
      success: false,
      error: 'Invalid table name: must be a valid Oracle identifier.',
    };
  }
  ```

### Step 5 — Update `getSampleValues.ts` import

**File**: `src/tools/discovery/getSampleValues.ts`

- Remove the local `validateOracleIdentifier` function definition.
- Add import: `import { validateOracleIdentifier } from '../../utils/validation.js';`
- All existing calls to `validateOracleIdentifier` within the file remain unchanged.

### Step 6 — Add regression tests

**File**: `tests/queryExecutor.test.ts` (extend existing file)

Add a `describe('getSchema SQL injection prevention')` block that:

1. **Injection attempt is rejected** — stub `getConnection` to return a mock `execute` that records its arguments. Call `getSchema("X') UNION SELECT username, account_status FROM all_users --")`. Assert the mock's recorded `binds` object equals `{ tableName: "X') UNION SELECT username, account_status FROM all_users --" }` (value safely bound, not interpolated) and the `sql` string does **not** contain `UNION SELECT`.
2. **Valid table name succeeds** — call `getSchema('EMPLOYEES')`, assert `binds` is `{ tableName: 'EMPLOYEES' }` and the `sql` uses `:tableName`.
3. **`undefined` tableName returns all-tables query** — call `getSchema()` with no argument, assert the query uses `FROM user_tables` and `binds` is `[]`.

**File**: `tests/getSchema.test.ts` (new file)

Add tests for the `getDatabaseSchema()` handler:

1. **Zod refinement rejects injection payload** — call `getDatabaseSchema({ tableName: "X') UNION SELECT username FROM all_users --" })` and assert the returned object has `success: false` and an error mentioning the invalid identifier.
2. **Zod refinement rejects names exceeding 30 chars** — verify the guard fires on an oversized identifier.
3. **Valid table name passes validation** — confirm a clean identifier like `EMPLOYEES` reaches the query layer.

### Step 7 — Build and verify

```bash
npm run build
```

Confirm zero TypeScript compilation errors, then run:

```bash
npx vitest run
```

All existing tests must continue to pass; the new injection-prevention tests must pass.

### Step 8 — Update `SECURITY.md`

Note that CVE-style SQL injection via `tableName` in `get_database_schema` was remediated by:
- Parameterized bind variables in the query layer
- Identifier validation at the MCP input boundary

No code snippets are needed in the security doc — a brief paragraph is sufficient.
