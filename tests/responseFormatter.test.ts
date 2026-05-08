import { describe, expect, it, vi } from 'vitest';

// Mocks must be hoisted before module imports.
vi.mock('../src/utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  audit: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// vi.hoisted ensures the value is available inside the vi.mock factory,
// which is hoisted to run before any top-level code.
const MOCK_CONFIG = vi.hoisted(() => ({
  MCP_MAX_STRING_LENGTH: 20,
  MCP_MAX_ROWS_IN_RESPONSE: 3,
  MCP_MAX_RESPONSE_CHARS: 10000,
  MAX_ROWS_PER_QUERY: 1000,
  ORACLE_POOL_MIN: 2,
  ORACLE_POOL_MAX: 10,
  ENFORCE_READ_ONLY_QUERIES: true,
  ENABLE_AUDIT_LOGGING: false,
}));

vi.mock('../src/config.js', () => ({
  default: () => MOCK_CONFIG,
  configSchema: {},
}));

import { formatToolResponse } from '../src/utils/responseFormatter.js';

describe('formatToolResponse', () => {
  it('returns a valid JSON string for a simple result', () => {
    const result = formatToolResponse('test_tool', { success: true, data: { rows: [], rowCount: 0, columns: [] } });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes the tool name in the response', () => {
    const result = formatToolResponse('my_tool', { success: true, data: { rows: [], rowCount: 0, columns: [] } });
    const parsed = JSON.parse(result);
    expect(parsed._tool).toBe('my_tool');
  });

  it('truncates string fields longer than MCP_MAX_STRING_LENGTH', () => {
    const longString = 'A'.repeat(100); // > 20 char limit in mock config
    const result = formatToolResponse('test_tool', {
      success: true,
      data: { rows: [{ name: longString }], rowCount: 1, columns: ['name'] },
    });
    const parsed = JSON.parse(result);
    expect(parsed.data.rows[0].name).toContain('truncated');
    expect(parsed.data.rows[0].name.length).toBeLessThan(longString.length);
  });

  it('does not truncate strings at or below MCP_MAX_STRING_LENGTH', () => {
    const shortString = 'A'.repeat(20); // exactly at the limit
    const result = formatToolResponse('test_tool', {
      success: true,
      data: { rows: [{ name: shortString }], rowCount: 1, columns: ['name'] },
    });
    const parsed = JSON.parse(result);
    expect(parsed.data.rows[0].name).toBe(shortString);
  });

  it('caps rows at MCP_MAX_ROWS_IN_RESPONSE', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const result = formatToolResponse('test_tool', {
      success: true,
      data: { rows, rowCount: 10, columns: ['id'] },
    });
    const parsed = JSON.parse(result);
    expect(parsed.data.rows).toHaveLength(3); // mock limit is 3
  });

  it('records dropped row count in truncation summary', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const result = formatToolResponse('test_tool', {
      success: true,
      data: { rows, rowCount: 10, columns: ['id'] },
    });
    const parsed = JSON.parse(result);
    expect(parsed._truncation.droppedRows).toBe(7); // 10 - 3
    expect(parsed._truncation.originalRows).toBe(10);
    expect(parsed._truncation.returnedRows).toBe(3);
  });

  it('handles discovery tool array shape (data: T[])', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ tableName: `TABLE_${i}` }));
    const result = formatToolResponse('list_tables', { success: true, data });
    const parsed = JSON.parse(result);
    expect(parsed.data).toHaveLength(3); // capped at mock limit
    expect(parsed._truncation.droppedRows).toBe(2);
  });

  it('handles non-record result (wraps in success envelope)', () => {
    const result = formatToolResponse('test_tool', 'raw string value');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('returns a structured error when response exceeds MCP_MAX_RESPONSE_CHARS', () => {
    // Generate a payload that serializes to > 10000 chars
    const rows = Array.from({ length: 3 }, () => ({ col: 'X'.repeat(20) }));
    const bigResult = {
      success: true,
      data: { rows, rowCount: 3, columns: ['col'] },
      // Pad the payload so the serialized JSON blows past MCP_MAX_RESPONSE_CHARS (10000)
      _padding: 'P'.repeat(12000),
    };
    const result = formatToolResponse('heavy_tool', bigResult);
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
    expect(parsed.remediation).toBeDefined();
  });

  it('preserves non-string field types unchanged', () => {
    const result = formatToolResponse('test_tool', {
      success: true,
      data: { rows: [{ count: 42, active: true, value: null }], rowCount: 1, columns: ['count', 'active', 'value'] },
    });
    const parsed = JSON.parse(result);
    expect(parsed.data.rows[0].count).toBe(42);
    expect(parsed.data.rows[0].active).toBe(true);
    expect(parsed.data.rows[0].value).toBeNull();
  });
});
