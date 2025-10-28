import { z } from 'zod';
import { getConnection } from '../../database/oracleConnection.js';
import logger, { audit } from '../../utils/logger.js';
import type { TableInfo } from './types.js';
import { schemaCache } from './cache.js';

// Input schema for listTables tool
export const ListTablesSchema = z.object({
  includeRowCounts: z.boolean().optional().default(false),
});

export type ListTablesInput = z.infer<typeof ListTablesSchema>;

/**
 * Get a summary of all accessible tables with optional row counts and metadata
 * 
 * This tool provides:
 * - Table names
 * - Approximate row counts (if includeRowCounts is true)
 * - Last modification timestamps (from Oracle stats)
 * - Tablespace information
 * - Table comments (semantic hints)
 * 
 * Results are cached for 5 minutes to improve performance.
 * 
 * @param input - Options for listing tables
 * @returns List of tables with metadata
 */
export async function listTables(input: ListTablesInput = { includeRowCounts: false }): Promise<{
  success: boolean;
  data?: TableInfo[];
  error?: string;
  cached?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const validated = ListTablesSchema.parse(input);
    
    // Check cache first
    const cacheKey = `listTables:${validated.includeRowCounts}`;
    const cached = schemaCache.get<TableInfo[]>(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached table list', { 
        count: cached.length,
        includeRowCounts: validated.includeRowCounts,
      });
      
      return {
        success: true,
        data: cached,
        cached: true,
      };
    }

    logger.info('Listing all accessible tables', {
      includeRowCounts: validated.includeRowCounts,
    });

    let connection;
    
    try {
      connection = await getConnection();

      // Build query based on options
      let query: string;
      
      if (validated.includeRowCounts) {
        // Get row counts from statistics (approximate but fast)
        // NOTE: Row counts from user_tab_statistics are APPROXIMATE and depend on
        // Oracle database statistics being up-to-date. They may be stale if:
        // - Statistics haven't been gathered recently (DBMS_STATS.GATHER_TABLE_STATS)
        // - The table has been heavily modified since last stats collection
        // - Statistics are locked or not collected for certain tables
        // For exact counts, use COUNT(*) queries, but this is much slower.
        query = `
          SELECT 
            t.table_name,
            NVL(s.num_rows, 0) as row_count,
            TO_CHAR(t.last_ddl_time, 'YYYY-MM-DD HH24:MI:SS') as last_modified,
            t.tablespace_name,
            c.comments
          FROM user_tables t
          LEFT JOIN user_tab_statistics s ON t.table_name = s.table_name
          LEFT JOIN user_tab_comments c ON t.table_name = c.table_name
          ORDER BY t.table_name
        `;
      } else {
        // Faster query without row counts
        query = `
          SELECT 
            t.table_name,
            TO_CHAR(t.last_ddl_time, 'YYYY-MM-DD HH24:MI:SS') as last_modified,
            t.tablespace_name,
            c.comments
          FROM user_tables t
          LEFT JOIN user_tab_comments c ON t.table_name = c.table_name
          ORDER BY t.table_name
        `;
      }

      const result = await connection.execute(query, [], {
        outFormat: 2, // OBJECT format
        maxRows: 1000,
      });

      const rows = result.rows as any[];
      
      const tables: TableInfo[] = rows.map((row) => {
        const tableInfo: TableInfo = {
          tableName: row.TABLE_NAME,
          rowCount: validated.includeRowCounts ? Number(row.ROW_COUNT || 0) : 0,
          tablespace: row.TABLESPACE_NAME || undefined,
        };

        if (row.LAST_MODIFIED) {
          tableInfo.lastModified = row.LAST_MODIFIED;
        }

        if (row.COMMENTS) {
          tableInfo.comments = row.COMMENTS;
        }

        return tableInfo;
      });

      const executionTime = Date.now() - startTime;

      // Cache the results
      schemaCache.set(cacheKey, tables);

      audit('Listed tables successfully', {
        tableCount: tables.length,
        includeRowCounts: validated.includeRowCounts,
        executionTime,
      });

      logger.info('Tables listed successfully', {
        count: tables.length,
        executionTime,
      });

      return {
        success: true,
        data: tables,
        cached: false,
      };

    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          logger.error('Error releasing connection', { error: err });
        }
      }
    }

  } catch (err: any) {
    const executionTime = Date.now() - startTime;
    
    logger.error('List tables failed', {
      error: err.message,
      executionTime,
    });

    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}
