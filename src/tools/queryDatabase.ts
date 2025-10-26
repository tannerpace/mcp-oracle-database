import { z } from 'zod';
import { executeQuery } from '../database/queryExecutor.js';
import logger from '../utils/logger.js';

// Input schema for query_database tool
export const QueryDatabaseSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  maxRows: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

export type QueryDatabaseInput = z.infer<typeof QueryDatabaseSchema>;

/**
 * Execute a SQL query against the Oracle database
 */
export async function queryDatabase(input: QueryDatabaseInput) {
  try {
    // Validate input
    const validated = QueryDatabaseSchema.parse(input);

    logger.info('Executing query via MCP tool', {
      queryLength: validated.query.length,
      maxRows: validated.maxRows,
    });

    // Execute the query
    const result = await executeQuery(validated.query, {
      maxRows: validated.maxRows,
      timeout: validated.timeout,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    logger.error('Query database tool failed', { error: err.message });

    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}
