import { describe, expect, it, vi } from 'vitest';

vi.mock('oracledb', () => ({ default: { OUT_FORMAT_OBJECT: 4 } }));

vi.mock('../src/config.js', () => ({
  default: () => ({
    ORACLE_POOL_MIN: 2,
    ORACLE_POOL_MAX: 10,
    QUERY_TIMEOUT_MS: 30000,
    MAX_ROWS_PER_QUERY: 1000,
    MAX_QUERY_LENGTH: 50000,
    ENFORCE_READ_ONLY_QUERIES: true,
    MCP_MAX_RESPONSE_CHARS: 50000,
    MCP_MAX_ROWS_IN_RESPONSE: 100,
    MCP_MAX_STRING_LENGTH: 300,
    LOG_LEVEL: 'info',
    ENABLE_AUDIT_LOGGING: false,
    MCP_TRANSPORT: 'stdio',
    SERVER_NAME: 'oracle-mcp-server',
    SERVER_VERSION: '1.0.0',
  }),
  configSchema: {},
}));

vi.mock('../src/database/oracleConnection.js', () => ({
  getConnection: vi.fn(),
  getOrCreatePool: vi.fn(),
  closePool: vi.fn(),
}));

vi.mock('../src/utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  audit: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getDatabaseSchema, GetSchemaSchema } from '../src/tools/getSchema.js';

describe('GetSchemaSchema Zod validation', () => {
  it('accepts a valid uppercase table name', () => {
    expect(() => GetSchemaSchema.parse({ tableName: 'EMPLOYEES' })).not.toThrow();
  });

  it('accepts a valid mixed-case table name (validator uppercases internally)', () => {
    expect(() => GetSchemaSchema.parse({ tableName: 'employees' })).not.toThrow();
  });

  it('accepts undefined tableName (list all tables)', () => {
    expect(() => GetSchemaSchema.parse({})).not.toThrow();
  });

  it('rejects a UNION SELECT injection payload', () => {
    expect(() =>
      GetSchemaSchema.parse({ tableName: "X') UNION SELECT username FROM all_users --" })
    ).toThrow('valid Oracle identifier');
  });

  it('rejects a tableName longer than 30 characters', () => {
    expect(() =>
      GetSchemaSchema.parse({ tableName: 'A'.repeat(31) })
    ).toThrow('valid Oracle identifier');
  });

  it('rejects a tableName starting with a digit', () => {
    expect(() =>
      GetSchemaSchema.parse({ tableName: '1TABLE' })
    ).toThrow('valid Oracle identifier');
  });

  it('rejects a tableName containing spaces', () => {
    expect(() =>
      GetSchemaSchema.parse({ tableName: 'MY TABLE' })
    ).toThrow('valid Oracle identifier');
  });

  it('rejects a tableName containing semicolons', () => {
    expect(() =>
      GetSchemaSchema.parse({ tableName: 'T; DROP TABLE T --' })
    ).toThrow('valid Oracle identifier');
  });
});

describe('getDatabaseSchema handler — input validation guard', () => {
  it('returns an error response for an injection payload without calling the DB', async () => {
    const result = await getDatabaseSchema({
      tableName: "X') UNION SELECT username, account_status FROM all_users --",
    });
    expect((result as any).success).toBe(false);
    expect((result as any).error).toMatch(/valid Oracle identifier/i);
  });

  it('returns an error response for a tableName longer than 30 chars', async () => {
    const result = await getDatabaseSchema({ tableName: 'A'.repeat(31) });
    expect((result as any).success).toBe(false);
    expect((result as any).error).toMatch(/valid Oracle identifier/i);
  });
});
