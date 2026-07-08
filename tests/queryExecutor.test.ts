import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before any module imports that trigger side-effects.
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

import { getConnection } from '../src/database/oracleConnection.js';
import {
  ensureReadOnlyQuery,
  getSchema,
  stripLeadingCommentsAndWhitespace,
} from '../src/database/queryExecutor.js';

describe('stripLeadingCommentsAndWhitespace', () => {
  it('returns the query unchanged when there are no leading comments or whitespace', () => {
    expect(stripLeadingCommentsAndWhitespace('SELECT 1 FROM DUAL')).toBe('SELECT 1 FROM DUAL');
  });

  it('strips leading whitespace', () => {
    expect(stripLeadingCommentsAndWhitespace('   SELECT 1 FROM DUAL')).toBe('SELECT 1 FROM DUAL');
  });

  it('strips a single-line comment followed by a query', () => {
    const input = '-- this is a comment\nSELECT 1 FROM DUAL';
    expect(stripLeadingCommentsAndWhitespace(input)).toBe('SELECT 1 FROM DUAL');
  });

  it('strips multiple single-line comments', () => {
    const input = '-- first comment\n-- second comment\nSELECT 1 FROM DUAL';
    expect(stripLeadingCommentsAndWhitespace(input)).toBe('SELECT 1 FROM DUAL');
  });

  it('strips a block comment', () => {
    const input = '/* block comment */ SELECT 1 FROM DUAL';
    expect(stripLeadingCommentsAndWhitespace(input)).toBe('SELECT 1 FROM DUAL');
  });

  it('strips a multi-line block comment', () => {
    const input = '/*\n  multi\n  line\n*/\nSELECT 1 FROM DUAL';
    expect(stripLeadingCommentsAndWhitespace(input)).toBe('SELECT 1 FROM DUAL');
  });

  it('strips mixed leading comment styles', () => {
    const input = '-- line comment\n/* block */\nSELECT 1 FROM DUAL';
    expect(stripLeadingCommentsAndWhitespace(input)).toBe('SELECT 1 FROM DUAL');
  });

  it('returns empty string for a comment-only input with no newline', () => {
    expect(stripLeadingCommentsAndWhitespace('-- only a comment')).toBe('');
  });

  it('returns empty string for an unterminated block comment', () => {
    expect(stripLeadingCommentsAndWhitespace('/* unterminated')).toBe('');
  });

  it('preserves inline comments that are NOT leading', () => {
    const query = 'SELECT 1 /* inline */ FROM DUAL';
    expect(stripLeadingCommentsAndWhitespace(query)).toBe(query);
  });
});

describe('ensureReadOnlyQuery', () => {
  it('allows a plain SELECT', () => {
    expect(() => ensureReadOnlyQuery('SELECT * FROM employees')).not.toThrow();
  });

  it('allows SELECT with leading whitespace', () => {
    expect(() => ensureReadOnlyQuery('  SELECT id FROM orders')).not.toThrow();
  });

  it('allows SELECT with a leading comment', () => {
    expect(() =>
      ensureReadOnlyQuery('-- get all\nSELECT id FROM orders')
    ).not.toThrow();
  });

  it('rejects INSERT', () => {
    expect(() => ensureReadOnlyQuery('INSERT INTO t VALUES (1)')).toThrow(
      'Only SELECT statements are allowed'
    );
  });

  it('rejects UPDATE', () => {
    expect(() => ensureReadOnlyQuery('UPDATE employees SET salary = 0')).toThrow(
      'Only SELECT statements are allowed'
    );
  });

  it('rejects DELETE', () => {
    expect(() => ensureReadOnlyQuery('DELETE FROM employees')).toThrow(
      'Only SELECT statements are allowed'
    );
  });

  it('rejects DROP', () => {
    expect(() => ensureReadOnlyQuery('DROP TABLE employees')).toThrow(
      'Only SELECT statements are allowed'
    );
  });

  it('rejects TRUNCATE', () => {
    expect(() => ensureReadOnlyQuery('TRUNCATE TABLE employees')).toThrow(
      'Only SELECT statements are allowed'
    );
  });

  it('rejects SELECT ... FOR UPDATE', () => {
    expect(() =>
      ensureReadOnlyQuery('SELECT id FROM employees FOR UPDATE')
    ).toThrow('FOR UPDATE');
  });

  it('rejects an empty query', () => {
    expect(() => ensureReadOnlyQuery('')).toThrow('Query cannot be empty');
  });

  it('rejects a whitespace-only query', () => {
    expect(() => ensureReadOnlyQuery('   ')).toThrow('Query cannot be empty');
  });

  it('rejects a comment-only query', () => {
    expect(() => ensureReadOnlyQuery('-- comment only')).toThrow('Query cannot be empty');
  });
});

describe('getSchema SQL injection prevention', () => {
  function makeMockConnection() {
    const calls: { sql: string; binds: unknown }[] = [];
    const mockExecute = vi.fn((sql: string, binds: unknown) => {
      calls.push({ sql, binds });
      return Promise.resolve({ rows: [], metaData: [] });
    });
    return {
      execute: mockExecute,
      close: vi.fn().mockResolvedValue(undefined),
      calls,
    };
  }

  beforeEach(() => {
    vi.mocked(getConnection).mockReset();
  });

  it('passes tableName as a bind variable — not interpolated into the SQL string', async () => {
    const mock = makeMockConnection();
    vi.mocked(getConnection).mockResolvedValue(mock as any);

    const payload = "X') UNION SELECT username, account_status FROM all_users --";
    await getSchema(payload).catch(() => { });

    expect(mock.calls.length).toBeGreaterThan(0);
    const { sql, binds } = mock.calls[0];

    // The injection payload must NOT appear verbatim in the SQL string
    expect(sql).not.toContain('UNION SELECT');
    expect(sql).not.toContain(payload);

    // The value must be passed as a positional bind, not concatenated
    expect(Array.isArray(binds)).toBe(true);
    expect((binds as unknown[])[0]).toBe(payload);
  });

  it('passes a valid table name as a bind variable', async () => {
    const mock = makeMockConnection();
    vi.mocked(getConnection).mockResolvedValue(mock as any);

    await getSchema('EMPLOYEES').catch(() => { });

    expect(mock.calls.length).toBeGreaterThan(0);
    const { sql, binds } = mock.calls[0];

    expect(sql).toContain(':tableName');
    expect(Array.isArray(binds)).toBe(true);
    expect((binds as unknown[])[0]).toBe('EMPLOYEES');
  });

  it('uses the all-tables query with empty binds when tableName is undefined', async () => {
    const mock = makeMockConnection();
    vi.mocked(getConnection).mockResolvedValue(mock as any);

    await getSchema(undefined).catch(() => { });

    expect(mock.calls.length).toBeGreaterThan(0);
    const { sql, binds } = mock.calls[0];

    expect(sql).toContain('user_tables');
    expect(Array.isArray(binds)).toBe(true);
    expect((binds as unknown[]).length).toBe(0);
  });
});
