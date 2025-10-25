import oracledb from 'oracledb';
import getConfig from '../config.js';
import logger, { audit } from '../logging/logger.js';
import { getConnection } from './oracleConnection.js';
import type { QueryResult } from './types.js';

const config = getConfig();

/**
 * Execute a read-only SELECT query with timeout and row limits
 */
export async function executeQuery(
  query: string,
  options: { maxRows?: number; timeout?: number } = {}
): Promise<QueryResult> {
  const maxRows = options.maxRows || config.MAX_ROWS_PER_QUERY;
  const startTime = Date.now();

  let connection;

  try {
    // Validate query length
    if (query.length > config.MAX_QUERY_LENGTH) {
      throw new Error(`Query exceeds maximum length of ${config.MAX_QUERY_LENGTH} characters`);
    }

    // Get connection from pool
    connection = await getConnection();

    // Execute query with timeout and row limit
    const result = await connection.execute(query, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows,
      extendedMetaData: true,
    });

    const executionTime = Date.now() - startTime;

    // Extract column names from metadata
    const columns = result.metaData?.map((col: { name: string }) => col.name) || [];

    const queryResult: QueryResult = {
      rows: (result.rows as Record<string, any>[]) || [],
      rowCount: result.rows?.length || 0,
      columns,
      executionTime,
    };

    // Audit log the query
    audit('Query executed successfully', {
      query: query.substring(0, 500), // First 500 chars
      rowCount: queryResult.rowCount,
      executionTime,
    });

    logger.debug('Query executed', {
      rowCount: queryResult.rowCount,
      columns: columns.length,
      executionTime,
    });

    return queryResult;
  } catch (err: any) {
    const executionTime = Date.now() - startTime;

    logger.error('Query execution failed', {
      error: err.message,
      query: query.substring(0, 200),
      executionTime,
    });

    audit('Query execution failed', {
      error: err.message,
      query: query.substring(0, 500),
      executionTime,
    });

    throw new Error(`Query failed: ${err.message}`);
  } finally {
    // Always release connection back to pool
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Error releasing connection', { error: err });
      }
    }
  }
}

/**
 * Get database schema information
 */
export async function getSchema(tableName?: string): Promise<any> {
  let query: string;

  if (tableName) {
    // Get columns for specific table
    query = `
      SELECT 
        column_name,
        data_type,
        data_length,
        nullable
      FROM user_tab_columns
      WHERE table_name = UPPER('${tableName}')
      ORDER BY column_id
    `;
  } else {
    // Get all accessible tables
    query = `
      SELECT 
        table_name,
        tablespace_name
      FROM user_tables
      ORDER BY table_name
    `;
  }

  return executeQuery(query, { maxRows: 1000 });
}
