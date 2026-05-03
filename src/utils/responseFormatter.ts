import getConfig from '../config.js';

const config = getConfig();

interface QueryDataShape {
  rows?: Record<string, unknown>[];
  rowCount?: number;
  columns?: string[];
  executionTime?: number;
}

interface ResponseShape {
  success?: boolean;
  data?: unknown;
  [key: string]: unknown;
}

interface TruncationSummary {
  maxResponseChars: number;
  maxRowsInResponse: number;
  maxStringLength: number;
  originalRows: number;
  returnedRows: number;
  droppedRows: number;
  truncatedStringFields: number;
  compactedForTokenEfficiency: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncateString(value: string): { value: string; truncated: boolean } {
  if (value.length <= config.MCP_MAX_STRING_LENGTH) {
    return { value, truncated: false };
  }

  const removed = value.length - config.MCP_MAX_STRING_LENGTH;
  return {
    value: `${value.slice(0, config.MCP_MAX_STRING_LENGTH)}... [truncated ${removed} chars]`,
    truncated: true,
  };
}

function truncateRowStrings(row: Record<string, unknown>): { row: Record<string, unknown>; truncatedCount: number } {
  const nextRow: Record<string, unknown> = {};
  let truncatedCount = 0;

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      const truncated = truncateString(value);
      nextRow[key] = truncated.value;
      if (truncated.truncated) {
        truncatedCount += 1;
      }
      continue;
    }

    nextRow[key] = value;
  }

  return { row: nextRow, truncatedCount };
}

function compactQueryData(
  toolName: string,
  response: ResponseShape
): { response: ResponseShape; summary: TruncationSummary | null } {
  if (!isRecord(response.data) || !Array.isArray(response.data.rows)) {
    return { response, summary: null };
  }

  const originalRows = response.data.rows.length;
  const cappedRows = response.data.rows.slice(0, config.MCP_MAX_ROWS_IN_RESPONSE);

  let truncatedStringFields = 0;
  const compactedRows = cappedRows.map((row) => {
    const { row: nextRow, truncatedCount } = truncateRowStrings(row);
    truncatedStringFields += truncatedCount;
    return nextRow;
  });

  const nextData: QueryDataShape = {
    ...response.data,
    rows: compactedRows,
  };

  const summary: TruncationSummary = {
    maxResponseChars: config.MCP_MAX_RESPONSE_CHARS,
    maxRowsInResponse: config.MCP_MAX_ROWS_IN_RESPONSE,
    maxStringLength: config.MCP_MAX_STRING_LENGTH,
    originalRows,
    returnedRows: compactedRows.length,
    droppedRows: Math.max(0, originalRows - compactedRows.length),
    truncatedStringFields,
    compactedForTokenEfficiency: true,
  };

  const nextResponse: ResponseShape = {
    ...response,
    data: nextData,
    _truncation: summary,
    _tool: toolName,
  };

  return { response: nextResponse, summary };
}

function buildSummaryPayload(toolName: string, response: ResponseShape, summary: TruncationSummary | null): ResponseShape {
  const data = isRecord(response.data) ? response.data : undefined;

  return {
    success: response.success === true,
    message: 'Response was summarized to stay within token budget. Narrow the query for full detail.',
    tool: toolName,
    summary,
    dataSummary: {
      rowCount: typeof data?.rowCount === 'number' ? data.rowCount : undefined,
      columnCount: Array.isArray(data?.columns) ? data.columns.length : undefined,
      executionTime: typeof data?.executionTime === 'number' ? data.executionTime : undefined,
      columns: Array.isArray(data?.columns) ? data.columns : undefined,
    },
  };
}

export function formatToolResponse(toolName: string, result: unknown): string {
  const baseResponse: ResponseShape = isRecord(result) ? { ...result } : { success: true, data: result };
  const compacted = compactQueryData(toolName, baseResponse);

  let text = JSON.stringify(compacted.response);
  if (text.length <= config.MCP_MAX_RESPONSE_CHARS) {
    return text;
  }

  if (isRecord(compacted.response.data) && Array.isArray(compacted.response.data.rows)) {
    const rows = compacted.response.data.rows;
    const reducedRows = rows.slice(0, Math.max(1, Math.floor(rows.length / 2)));
    const reducedPayload: ResponseShape = {
      ...compacted.response,
      data: {
        ...compacted.response.data,
        rows: reducedRows,
      },
    };

    text = JSON.stringify(reducedPayload);
    if (text.length <= config.MCP_MAX_RESPONSE_CHARS) {
      return text;
    }
  }

  const summarized = buildSummaryPayload(toolName, compacted.response, compacted.summary);
  text = JSON.stringify(summarized);

  if (text.length <= config.MCP_MAX_RESPONSE_CHARS) {
    return text;
  }

  return JSON.stringify({
    success: false,
    error: 'Tool response exceeded configured max size. Reduce query scope or lower maxRows.',
    tool: toolName,
    maxResponseChars: config.MCP_MAX_RESPONSE_CHARS,
  });
}
