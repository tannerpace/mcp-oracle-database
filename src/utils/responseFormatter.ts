import getConfig from '../config.js';
import logger from './logger.js';

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

interface Remediation {
  description: string;
  envVars: Record<string, string>;
  exampleValues: Record<string, string>;
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
  dataLossWarning?: string;
  remediation?: Remediation;
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

function compactArrayData(
  toolName: string,
  response: ResponseShape,
  arr: unknown[]
): { response: ResponseShape; summary: TruncationSummary } {
  const originalRows = arr.length;
  const cappedRows = arr.slice(0, config.MCP_MAX_ROWS_IN_RESPONSE);

  let truncatedStringFields = 0;
  const compactedRows = cappedRows.map((item) => {
    if (!isRecord(item)) return item;
    const { row: nextRow, truncatedCount } = truncateRowStrings(item);
    truncatedStringFields += truncatedCount;
    return nextRow;
  });

  const droppedRows = Math.max(0, originalRows - compactedRows.length);
  const summary: TruncationSummary = {
    maxResponseChars: config.MCP_MAX_RESPONSE_CHARS,
    maxRowsInResponse: config.MCP_MAX_ROWS_IN_RESPONSE,
    maxStringLength: config.MCP_MAX_STRING_LENGTH,
    originalRows,
    returnedRows: compactedRows.length,
    droppedRows,
    truncatedStringFields,
    compactedForTokenEfficiency: true,
  };

  if (droppedRows > 0 || truncatedStringFields > 0) {
    summary.dataLossWarning = [
      droppedRows > 0 ? `${droppedRows} item(s) were dropped (MCP_MAX_ROWS_IN_RESPONSE=${config.MCP_MAX_ROWS_IN_RESPONSE}).` : '',
      truncatedStringFields > 0 ? `${truncatedStringFields} string field(s) were truncated (MCP_MAX_STRING_LENGTH=${config.MCP_MAX_STRING_LENGTH}).` : '',
    ].filter(Boolean).join(' ');

    logger.warn('MCP response compacted due to token limits', {
      tool: toolName,
      originalRows,
      returnedRows: compactedRows.length,
      droppedRows,
      truncatedStringFields,
    });
  }

  return {
    response: { ...response, data: compactedRows, _truncation: summary, _tool: toolName },
    summary,
  };
}

function compactQueryData(
  toolName: string,
  response: ResponseShape
): { response: ResponseShape; summary: TruncationSummary | null } {
  // Discovery tools return data as a direct array (e.g. listTables → data: TableInfo[])
  if (Array.isArray(response.data)) {
    return compactArrayData(toolName, response, response.data);
  }

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

  const droppedRows = Math.max(0, originalRows - compactedRows.length);

  const summary: TruncationSummary = {
    maxResponseChars: config.MCP_MAX_RESPONSE_CHARS,
    maxRowsInResponse: config.MCP_MAX_ROWS_IN_RESPONSE,
    maxStringLength: config.MCP_MAX_STRING_LENGTH,
    originalRows,
    returnedRows: compactedRows.length,
    droppedRows,
    truncatedStringFields,
    compactedForTokenEfficiency: true,
  };

  if (droppedRows > 0 || truncatedStringFields > 0) {
    summary.dataLossWarning = [
      droppedRows > 0 ? `${droppedRows} row(s) were dropped (MCP_MAX_ROWS_IN_RESPONSE=${config.MCP_MAX_ROWS_IN_RESPONSE}).` : '',
      truncatedStringFields > 0 ? `${truncatedStringFields} string field(s) were truncated (MCP_MAX_STRING_LENGTH=${config.MCP_MAX_STRING_LENGTH}).` : '',
    ].filter(Boolean).join(' ');

    summary.remediation = {
      description: 'Adjust these environment variables to see more data. Restart the MCP server after changing them.',
      envVars: {
        MCP_MAX_ROWS_IN_RESPONSE: 'Controls max rows returned per tool call (current: ' + config.MCP_MAX_ROWS_IN_RESPONSE + ')',
        MCP_MAX_STRING_LENGTH: 'Controls max characters per string field (current: ' + config.MCP_MAX_STRING_LENGTH + ')',
        MCP_MAX_RESPONSE_CHARS: 'Hard cap on total response size in characters (current: ' + config.MCP_MAX_RESPONSE_CHARS + ')',
        MAX_ROWS_PER_QUERY: 'Controls max rows fetched from Oracle (current: ' + config.MAX_ROWS_PER_QUERY + ')',
      },
      exampleValues: {
        MCP_MAX_ROWS_IN_RESPONSE: '250',
        MCP_MAX_STRING_LENGTH: '1000',
        MCP_MAX_RESPONSE_CHARS: '32000',
        MAX_ROWS_PER_QUERY: '500',
      },
    };

    logger.warn('MCP response compacted due to token limits', {
      tool: toolName,
      originalRows,
      returnedRows: compactedRows.length,
      droppedRows,
      truncatedStringFields,
    });
  }

  const nextResponse: ResponseShape = {
    ...response,
    data: nextData,
    _truncation: summary,
    _tool: toolName,
  };

  return { response: nextResponse, summary };
}

function buildSummaryPayload(toolName: string, response: ResponseShape, summary: TruncationSummary | null, overLimitChars: number): ResponseShape {
  const data = isRecord(response.data) ? response.data : undefined;

  const remediation: Remediation = {
    description: 'The serialized response exceeded MCP_MAX_RESPONSE_CHARS. Adjust the environment variables below and restart the MCP server to retrieve full results.',
    envVars: {
      MCP_MAX_RESPONSE_CHARS: `Hard cap on total response characters (current: ${config.MCP_MAX_RESPONSE_CHARS})`,
      MCP_MAX_ROWS_IN_RESPONSE: `Max rows returned per tool call (current: ${config.MCP_MAX_ROWS_IN_RESPONSE})`,
      MCP_MAX_STRING_LENGTH: `Max characters per string field (current: ${config.MCP_MAX_STRING_LENGTH})`,
      MAX_ROWS_PER_QUERY: `Max rows Oracle fetches per query (current: ${config.MAX_ROWS_PER_QUERY})`,
    },
    exampleValues: {
      MCP_MAX_RESPONSE_CHARS: String(config.MCP_MAX_RESPONSE_CHARS * 2),
      MCP_MAX_ROWS_IN_RESPONSE: String(Math.max(10, Math.floor(config.MCP_MAX_ROWS_IN_RESPONSE / 2))),
      MCP_MAX_STRING_LENGTH: String(Math.max(50, Math.floor(config.MCP_MAX_STRING_LENGTH / 2))),
      MAX_ROWS_PER_QUERY: String(Math.max(10, Math.floor(config.MAX_ROWS_PER_QUERY / 2))),
    },
  };

  return {
    success: false,
    error: `Response for tool '${toolName}' exceeded MCP_MAX_RESPONSE_CHARS (${config.MCP_MAX_RESPONSE_CHARS}). Serialized size was approximately ${overLimitChars} characters. Full data was not returned.`,
    tool: toolName,
    dataLoss: 'Some or all rows were omitted from this response. Use narrower queries or increase token limits to retrieve full results.',
    remediation,
    dataSummary: {
      rowCount: typeof data?.rowCount === 'number' ? data.rowCount : undefined,
      columnCount: Array.isArray(data?.columns) ? data.columns.length : undefined,
      executionTime: typeof data?.executionTime === 'number' ? data.executionTime : undefined,
      columns: Array.isArray(data?.columns) ? data.columns : undefined,
    },
    truncationDetails: summary,
  };
}

export function formatToolResponse(toolName: string, result: unknown): string {
  const baseResponse: ResponseShape = isRecord(result) ? { ...result } : { success: true, data: result };
  const compacted = compactQueryData(toolName, baseResponse);

  let text = JSON.stringify(compacted.response);
  if (text.length <= config.MCP_MAX_RESPONSE_CHARS) {
    return text;
  }

  // Stage 1a: halve a direct array (discovery tools shape: data: T[])
  if (Array.isArray(compacted.response.data)) {
    const arr = compacted.response.data;
    const halvedCount = Math.max(1, Math.floor(arr.length / 2));
    const droppedByHalving = arr.length - halvedCount;

    logger.warn('MCP array response over limit after compaction; halving item count', {
      tool: toolName,
      originalSerializedChars: text.length,
      limit: config.MCP_MAX_RESPONSE_CHARS,
      itemsBefore: arr.length,
      itemsAfter: halvedCount,
      droppedItems: droppedByHalving,
      hint: 'Lower MCP_MAX_ROWS_IN_RESPONSE or raise MCP_MAX_RESPONSE_CHARS to avoid this.',
    });

    const reducedPayload: ResponseShape = {
      ...compacted.response,
      data: arr.slice(0, halvedCount),
      _halved: {
        warning: `Item count was halved from ${arr.length} to ${halvedCount} because the response exceeded MCP_MAX_RESPONSE_CHARS (${config.MCP_MAX_RESPONSE_CHARS}).`,
        droppedItems: droppedByHalving,
        remediation: `Lower MCP_MAX_ROWS_IN_RESPONSE (current: ${config.MCP_MAX_ROWS_IN_RESPONSE}) or raise MCP_MAX_RESPONSE_CHARS (current: ${config.MCP_MAX_RESPONSE_CHARS}).`,
      },
    };

    text = JSON.stringify(reducedPayload);
    if (text.length <= config.MCP_MAX_RESPONSE_CHARS) {
      return text;
    }
  }

  // Stage 1b: halve row count for SQL result shape (data: { rows: [...] })
  if (isRecord(compacted.response.data) && Array.isArray(compacted.response.data.rows)) {
    const rows = compacted.response.data.rows;
    const halvedCount = Math.max(1, Math.floor(rows.length / 2));
    const reducedRows = rows.slice(0, halvedCount);
    const droppedByHalving = rows.length - halvedCount;

    logger.warn('MCP response over limit after compaction; halving row count', {
      tool: toolName,
      originalSerializedChars: text.length,
      limit: config.MCP_MAX_RESPONSE_CHARS,
      rowsBefore: rows.length,
      rowsAfter: halvedCount,
      droppedRows: droppedByHalving,
      hint: 'Lower MCP_MAX_ROWS_IN_RESPONSE or MCP_MAX_STRING_LENGTH to avoid this.',
    });

    const reducedPayload: ResponseShape = {
      ...compacted.response,
      data: {
        ...compacted.response.data,
        rows: reducedRows,
      },
      _halved: {
        warning: `Row count was halved from ${rows.length} to ${halvedCount} because the response exceeded MCP_MAX_RESPONSE_CHARS (${config.MCP_MAX_RESPONSE_CHARS}).`,
        droppedRows: droppedByHalving,
        remediation: `Lower MCP_MAX_ROWS_IN_RESPONSE (current: ${config.MCP_MAX_ROWS_IN_RESPONSE}) or raise MCP_MAX_RESPONSE_CHARS (current: ${config.MCP_MAX_RESPONSE_CHARS}).`,
      },
    };

    text = JSON.stringify(reducedPayload);
    if (text.length <= config.MCP_MAX_RESPONSE_CHARS) {
      return text;
    }
  }

  // Stage 2: emit a structured error with full remediation guidance
  const overLimitChars = text.length;

  logger.error('MCP response exceeded max chars even after row reduction; returning structured error', {
    tool: toolName,
    serializedChars: overLimitChars,
    limit: config.MCP_MAX_RESPONSE_CHARS,
    currentConfig: {
      MCP_MAX_RESPONSE_CHARS: config.MCP_MAX_RESPONSE_CHARS,
      MCP_MAX_ROWS_IN_RESPONSE: config.MCP_MAX_ROWS_IN_RESPONSE,
      MCP_MAX_STRING_LENGTH: config.MCP_MAX_STRING_LENGTH,
      MAX_ROWS_PER_QUERY: config.MAX_ROWS_PER_QUERY,
    },
  });

  const summarized = buildSummaryPayload(toolName, compacted.response, compacted.summary, overLimitChars);
  return JSON.stringify(summarized);
}
