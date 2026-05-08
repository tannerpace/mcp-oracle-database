import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config.js';

describe('configSchema', () => {
  it('applies schema defaults when no env vars are provided', () => {
    const result = configSchema.parse({});
    expect(result.ORACLE_POOL_MIN).toBe(2);
    expect(result.ORACLE_POOL_MAX).toBe(10);
    expect(result.QUERY_TIMEOUT_MS).toBe(30000);
    expect(result.MAX_ROWS_PER_QUERY).toBe(1000);
    expect(result.MAX_QUERY_LENGTH).toBe(50000);
    expect(result.ENFORCE_READ_ONLY_QUERIES).toBe(true);
    expect(result.MCP_MAX_RESPONSE_CHARS).toBe(50000);
    expect(result.MCP_MAX_ROWS_IN_RESPONSE).toBe(100);
    expect(result.MCP_MAX_STRING_LENGTH).toBe(300);
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.ENABLE_AUDIT_LOGGING).toBe(true);
    expect(result.MCP_TRANSPORT).toBe('stdio');
    expect(result.SERVER_NAME).toBe('oracle-mcp-server');
    expect(result.SERVER_VERSION).toBe('1.0.0');
  });

  it('allows credentials to be absent', () => {
    const result = configSchema.parse({});
    expect(result.ORACLE_CONNECTION_STRING).toBeUndefined();
    expect(result.ORACLE_USER).toBeUndefined();
    expect(result.ORACLE_PASSWORD).toBeUndefined();
  });

  it('coerces string numbers to integers', () => {
    const result = configSchema.parse({
      ORACLE_POOL_MIN: '5',
      ORACLE_POOL_MAX: '20',
      QUERY_TIMEOUT_MS: '60000',
      MAX_ROWS_PER_QUERY: '500',
    });
    expect(result.ORACLE_POOL_MIN).toBe(5);
    expect(result.ORACLE_POOL_MAX).toBe(20);
    expect(result.QUERY_TIMEOUT_MS).toBe(60000);
    expect(result.MAX_ROWS_PER_QUERY).toBe(500);
  });

  // z.coerce.boolean() uses JavaScript's Boolean() coercion:
  // any non-empty string → true, so 'false' → true.
  it('coerces non-empty string to boolean true (JS Boolean() coercion)', () => {
    const result = configSchema.parse({ ENFORCE_READ_ONLY_QUERIES: 'false' });
    expect(result.ENFORCE_READ_ONLY_QUERIES).toBe(true);
  });

  it('coerces empty string to boolean false', () => {
    const result = configSchema.parse({ ENFORCE_READ_ONLY_QUERIES: '' });
    expect(result.ENFORCE_READ_ONLY_QUERIES).toBe(false);
  });

  it('coerces string "true" to boolean true', () => {
    const result = configSchema.parse({ ENABLE_AUDIT_LOGGING: 'true' });
    expect(result.ENABLE_AUDIT_LOGGING).toBe(true);
  });

  it('rejects ORACLE_POOL_MIN below 1', () => {
    expect(() => configSchema.parse({ ORACLE_POOL_MIN: '0' })).toThrow();
  });

  it('rejects ORACLE_POOL_MAX below 1', () => {
    expect(() => configSchema.parse({ ORACLE_POOL_MAX: '0' })).toThrow();
  });

  it('rejects QUERY_TIMEOUT_MS below 1000', () => {
    expect(() => configSchema.parse({ QUERY_TIMEOUT_MS: '999' })).toThrow();
  });

  it('rejects MCP_MAX_RESPONSE_CHARS below 500', () => {
    expect(() => configSchema.parse({ MCP_MAX_RESPONSE_CHARS: '499' })).toThrow();
  });

  it('accepts custom credential strings', () => {
    const result = configSchema.parse({
      ORACLE_CONNECTION_STRING: 'localhost:1521/XEPDB1',
      ORACLE_USER: 'readonly_user',
      ORACLE_PASSWORD: 'secret',
    });
    expect(result.ORACLE_CONNECTION_STRING).toBe('localhost:1521/XEPDB1');
    expect(result.ORACLE_USER).toBe('readonly_user');
    expect(result.ORACLE_PASSWORD).toBe('secret');
  });
});
